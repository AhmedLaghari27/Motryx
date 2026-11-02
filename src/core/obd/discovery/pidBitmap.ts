import { compactHex, hexToBytes } from '../adapter/responses';
import { hex2 } from '../decoder/mode01';

/**
 * Each "supported PIDs" reply carries 32 bits for the next 32 PIDs, most significant bit first.
 * Bit 0 is basePid + 1 and bit 31 is basePid + 0x20, which also means "ask the next range".
 */
export function bitmapToPids(basePid: number, bytes: readonly number[]): number[] {
  const word = (((bytes[0] ?? 0) << 24) | ((bytes[1] ?? 0) << 16) | ((bytes[2] ?? 0) << 8) | (bytes[3] ?? 0)) >>> 0;
  const pids: number[] = [];
  for (let i = 0; i < 32; i++) {
    if (((word >>> (31 - i)) & 1) === 1) pids.push(basePid + 1 + i);
  }
  return pids;
}

/**
 * Reads the bitmap from a reply. When several control units answer (one line each), a PID counts
 * as supported if any of them supports it. Returns null if no line is a valid bitmap reply.
 */
export function extractBitmap(lines: readonly string[], basePid: number): number[] | null {
  const prefix = `41${hex2(basePid)}`;
  let combined: number[] | null = null;
  for (const line of lines) {
    const hex = compactHex(line);
    if (!hex.startsWith(prefix)) continue;
    const payload = hexToBytes(hex.slice(prefix.length));
    if (!payload || payload.length < 4) continue;
    const four = payload.slice(0, 4);
    combined = combined ? combined.map((byte, i) => byte | (four[i] ?? 0)) : four;
  }
  return combined;
}
