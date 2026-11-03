export type PollClass = 'fast' | 'normal' | 'slow';
/** foreground: a cockpit tile or an active recording. background: merely visible in a list. */
export type PollPriority = 'foreground' | 'background';

// Fast-changing values are asked for often; slow-changing ones rarely, so the adapter is not flooded.
const FAST = new Set([0x04, 0x0b, 0x0c, 0x0d, 0x0e, 0x10, 0x11, 0x45, 0x49]);
const SLOW = new Set([0x05, 0x0f, 0x1f, 0x21, 0x2f, 0x31, 0x33, 0x46, 0x5c]);

export function pollClassFor(pid: number): PollClass {
  if (FAST.has(pid)) return 'fast';
  if (SLOW.has(pid)) return 'slow';
  return 'normal';
}

export type PollIntervals = Record<PollClass, number>;

export const DEFAULT_INTERVALS: PollIntervals = { fast: 250, normal: 1000, slow: 3000 };
export const BACKGROUND_FACTOR = 2;
export const MAX_RETRY_MS = 5000;
export const MIN_STALE_MS = 2000;

export function baseIntervalMs(pid: number, priority: PollPriority, intervals: PollIntervals = DEFAULT_INTERVALS): number {
  return intervals[pollClassFor(pid)] * (priority === 'background' ? BACKGROUND_FACTOR : 1);
}

/** After repeated failures, ask less often instead of hammering a sensor that does not answer. */
export function retryDelayMs(baseMs: number, consecutiveFailures: number): number {
  return Math.min(MAX_RETRY_MS, baseMs * 2 ** Math.min(consecutiveFailures, 6));
}

/** Three missed updates, but never sooner than 2 s, and slower if the adapter itself is slow. */
export function staleAfterMs(baseMs: number, observedGapMs: number | null): number {
  return Math.max(MIN_STALE_MS, 3 * Math.max(baseMs, observedGapMs ?? 0));
}
