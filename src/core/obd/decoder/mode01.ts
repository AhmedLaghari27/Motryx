import { compactHex, hexToBytes } from '../adapter/responses';
import type { SensorDef } from '../pid-registry/registry';

export const hex2 = (n: number): string => n.toString(16).toUpperCase().padStart(2, '0');

export type DecodeResult = { ok: true; value: number } | { ok: false; error: 'MALFORMED' | 'OUT_OF_RANGE' };

const EPSILON = 1e-9;

/**
 * Finds "41 <pid> <data...>" in a reply and returns exactly byteCount data bytes, or null.
 * Expects headers off (ATH0), which the adapter setup requests.
 */
export function parseMode01Response(lines: readonly string[], pid: number, byteCount: number): number[] | null {
  const prefix = `41${hex2(pid)}`;
  for (const line of lines) {
    const hex = compactHex(line);
    if (!hex.startsWith(prefix)) continue;
    const payload = hexToBytes(hex.slice(prefix.length));
    if (payload && payload.length >= byteCount) return payload.slice(0, byteCount);
  }
  return null;
}

/** Decodes raw data bytes with the sensor's formula and rejects values outside its valid range. */
export function decodeSensorBytes(def: SensorDef, bytes: readonly number[]): DecodeResult {
  if (bytes.length !== def.bytes || bytes.some((b) => !Number.isInteger(b) || b < 0 || b > 255)) {
    return { ok: false, error: 'MALFORMED' };
  }
  const value = def.decode(bytes[0] ?? 0, bytes[1] ?? 0);
  if (!Number.isFinite(value) || value < def.min - EPSILON || value > def.max + EPSILON) {
    return { ok: false, error: 'OUT_OF_RANGE' };
  }
  return { ok: true, value };
}

export function decodeMode01(def: SensorDef, lines: readonly string[]): DecodeResult {
  const bytes = parseMode01Response(lines, def.pid, def.bytes);
  return bytes ? decodeSensorBytes(def, bytes) : { ok: false, error: 'MALFORMED' };
}
