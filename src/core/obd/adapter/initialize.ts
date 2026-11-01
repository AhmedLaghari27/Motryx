import type { AdapterErrorCode } from './errors';
import type { Elm327Client } from './Elm327Client';
import { compactHex, type CommandResult } from './responses';

export type AdapterInfo = {
  /** What the adapter claims. Cheap clones often fake this, so never rely on it. */
  version: string | null;
  protocolNumber: string | null;
  protocolName: string | null;
};

export type InitResult = { ok: true; info: AdapterInfo } | { ok: false; error: AdapterErrorCode };

export type InitTimeouts = { reset: number; at: number; probe: number; query: number };

export const DEFAULT_INIT_TIMEOUTS: InitTimeouts = { reset: 4000, at: 1500, probe: 12000, query: 2000 };

const PROTOCOLS: Record<string, string> = {
  '1': 'SAE J1850 PWM',
  '2': 'SAE J1850 VPW',
  '3': 'ISO 9141-2',
  '4': 'ISO 14230-4 KWP (5 baud init)',
  '5': 'ISO 14230-4 KWP (fast init)',
  '6': 'ISO 15765-4 CAN (11 bit, 500 kbaud)',
  '7': 'ISO 15765-4 CAN (29 bit, 500 kbaud)',
  '8': 'ISO 15765-4 CAN (11 bit, 250 kbaud)',
  '9': 'ISO 15765-4 CAN (29 bit, 250 kbaud)',
  A: 'SAE J1939 CAN (29 bit, 250 kbaud)',
};

export function protocolName(number: string): string | null {
  return PROTOCOLS[number.toUpperCase()] ?? null;
}

/** ATDPN answers like "A6": a leading "A" means the adapter chose it automatically. */
export function parseProtocolNumber(line: string | undefined): string | null {
  if (!line) return null;
  const value = line.trim().toUpperCase();
  const number = value.startsWith('A') && value.length > 1 ? value.slice(1) : value;
  return /^[0-9A-C]$/.test(number) ? number : null;
}

const fail = (error: AdapterErrorCode): InitResult => ({ ok: false, error });

function probeError(result: Extract<CommandResult, { ok: false }>): AdapterErrorCode {
  switch (result.error) {
    case 'UNABLE_TO_CONNECT':
    case 'NO_DATA':
      return 'VEHICLE_NOT_RESPONDING';
    case 'BUS_ERROR':
      return 'BUS_ERROR';
    case 'TIMEOUT':
      return 'ADAPTER_TIMEOUT';
    case 'DISCONNECTED':
      return 'DISCONNECTED';
    default:
      return 'MALFORMED';
  }
}

/**
 * Brings an ELM327 into a known state, then proves the car answers.
 * Distinguishes "the device is not an adapter" from "the adapter is fine but the car is silent".
 */
export async function initializeAdapter(
  client: Elm327Client,
  overrides: Partial<InitTimeouts> = {},
): Promise<InitResult> {
  const t = { ...DEFAULT_INIT_TIMEOUTS, ...overrides };

  // 1. Reset. Some clones need a second try.
  let reset = await client.send('ATZ', { timeoutMs: t.reset });
  if (!reset.ok && reset.error !== 'DISCONNECTED') reset = await client.send('ATZ', { timeoutMs: t.reset });
  if (!reset.ok) return fail(reset.error === 'DISCONNECTED' ? 'DISCONNECTED' : 'NOT_AN_ELM327');
  const version = reset.lines.find((line) => /ELM\d+/i.test(line)) ?? null;

  // 2. Configure: echo off, linefeeds off, spaces off, headers off, automatic protocol.
  // Individual refusals are tolerated (clones differ); only a dead link stops us.
  for (const command of ['ATE0', 'ATL0', 'ATS0', 'ATH0', 'ATSP0']) {
    const result = await client.send(command, { timeoutMs: t.at });
    if (!result.ok && result.error === 'DISCONNECTED') return fail('DISCONNECTED');
    if (!result.ok && result.error === 'TIMEOUT') return fail('ADAPTER_TIMEOUT');
  }

  // 3. Prove the car answers. The first request can take several seconds while the adapter
  //    searches for the protocol.
  const probe = await client.send('0100', { timeoutMs: t.probe });
  if (!probe.ok) return fail(probeError(probe));
  if (!probe.lines.some((line) => compactHex(line).includes('4100'))) return fail('MALFORMED');

  // 4. Which protocol did it pick? Nice to know, never required.
  const dpn = await client.send('ATDPN', { timeoutMs: t.query });
  const protocolNumber = dpn.ok ? parseProtocolNumber(dpn.lines[0]) : null;

  return {
    ok: true,
    info: { version, protocolNumber, protocolName: protocolNumber ? protocolName(protocolNumber) : null },
  };
}
