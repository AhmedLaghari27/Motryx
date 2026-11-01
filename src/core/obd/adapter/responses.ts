export type ElmErrorCode =
  | 'NO_DATA'
  | 'UNABLE_TO_CONNECT'
  | 'BUS_ERROR'
  | 'BUFFER_FULL'
  | 'STOPPED'
  | 'UNKNOWN_COMMAND'
  | 'TIMEOUT'
  | 'DISCONNECTED'
  | 'MALFORMED';

export type CommandResult =
  | { ok: true; lines: string[] }
  | { ok: false; error: ElmErrorCode; lines: string[] };

const compact = (text: string) => text.replace(/\s+/g, '').toUpperCase();

export const compactHex = compact;

/** Splits a reply into clean lines: no echo of our command, no "SEARCHING..." noise, no blanks. */
export function normalizeLines(raw: string, command: string): string[] {
  const echo = compact(command);
  return raw
    .split(/[\r\n]+/)
    .map((line) => line.replace(/^>+/, '').trim())
    .filter((line) => line.length > 0)
    .filter((line) => compact(line) !== echo)
    .filter((line) => !/^SEARCHING/i.test(line));
}

/** Known ELM327 error replies. A real data line never contains these. */
function findErrorCode(lines: string[]): ElmErrorCode | null {
  for (const line of lines) {
    const u = line.toUpperCase();
    if (u.includes('UNABLE TO CONNECT')) return 'UNABLE_TO_CONNECT';
    if (u.includes('NO DATA')) return 'NO_DATA';
    if (
      (u.includes('BUS INIT') && u.includes('ERROR')) ||
      u.includes('BUS ERROR') ||
      u.includes('CAN ERROR') ||
      u.includes('FB ERROR') ||
      u.includes('DATA ERROR') ||
      /^ERR\d+/.test(u)
    ) {
      return 'BUS_ERROR';
    }
    if (u.includes('BUFFER FULL')) return 'BUFFER_FULL';
    if (u.includes('STOPPED')) return 'STOPPED';
    if (u === '?') return 'UNKNOWN_COMMAND';
  }
  return null;
}

export function classifyResponse(raw: string, command: string): CommandResult {
  const lines = normalizeLines(raw, command);
  const error = findErrorCode(lines);
  return error ? { ok: false, error, lines } : { ok: true, lines };
}

/** "41 0C 1A F8" -> [0x41, 0x0c, 0x1a, 0xf8]. Returns null if it is not clean hex. */
export function hexToBytes(line: string): number[] | null {
  const hex = compact(line);
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9A-F]+$/.test(hex)) return null;
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
  return bytes;
}
