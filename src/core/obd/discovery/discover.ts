import type { Elm327Client } from '../adapter/Elm327Client';
import { elmErrorToAdapterError, type AdapterErrorCode } from '../adapter/errors';
import { hex2 } from '../decoder/mode01';
import { bitmapToPids, extractBitmap } from './pidBitmap';
import type { VehicleCapabilities } from './capabilities';

/** Ranges of 32 PIDs each: 01-20, 21-40, 41-60, 61-80, 81-A0, A1-C0, C1-E0. */
export const RANGE_BASES = [0x00, 0x20, 0x40, 0x60, 0x80, 0xa0, 0xc0] as const;

export type DiscoveryResult =
  | { ok: true; capabilities: VehicleCapabilities; warnings: string[] }
  | { ok: false; error: AdapterErrorCode };

type Options = {
  /** Called after each range is read, with how many ranges are done so far */
  onProgress?: (rangesDone: number) => void;
  timeoutMs?: number;
  now?: number;
};

/**
 * Asks the car which standard PIDs it supports, following the chain of ranges until one says
 * "no more". Nothing is assumed: a PID is only supported if the car said so.
 */
export async function discoverSupportedPids(
  client: Pick<Elm327Client, 'send'>,
  options: Options = {},
): Promise<DiscoveryResult> {
  const supported = new Set<number>();
  const warnings: string[] = [];
  let highest = -1;
  let complete = true;

  for (const base of RANGE_BASES) {
    const command = `01${hex2(base)}`;
    const reply = await client.send(command, { timeoutMs: options.timeoutMs ?? 4000 });

    const bitmap = reply.ok ? extractBitmap(reply.lines, base) : null;
    if (!bitmap) {
      // The first range must work. A later range failing only means we know less, so say so.
      if (highest === -1) return { ok: false, error: reply.ok ? 'MALFORMED' : elmErrorToAdapterError(reply.error) };
      warnings.push(`The car did not answer for sensors ${hex2(base + 1)}–${hex2(base + 0x20)}, so some may be missing.`);
      complete = false;
      break;
    }

    highest = base;
    const pids = bitmapToPids(base, bitmap);
    pids.forEach((pid) => supported.add(pid));
    options.onProgress?.(RANGE_BASES.indexOf(base) + 1);

    if (!pids.includes(base + 0x20)) break; // last bit clear: no further ranges
  }

  const isRangeMarker = (pid: number) => pid % 0x20 === 0;
  return {
    ok: true,
    warnings,
    capabilities: {
      discoveredAt: options.now ?? Date.now(),
      supportedPids: [...supported].filter((pid) => !isRangeMarker(pid)).sort((a, b) => a - b),
      highestRangeBase: highest,
      complete,
    },
  };
}
