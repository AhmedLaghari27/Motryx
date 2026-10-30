import type { Reading } from '@/types/telemetry';
import { formatNumber } from './units';

export type ReadingView = {
  valueText: string;
  unitText: string;
  statusLabel: string;
  detail: string | null;
  /** true only for live data that may be shown at full emphasis */
  emphasized: boolean;
};

export function formatAge(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 1) return 'just now';
  if (s < 60) return `${s} s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)} h ago`;
}

function valueToText(value: Reading['value'], decimals: number): string | null {
  if (value === null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? formatNumber(value, decimals) : null;
  return value.length > 0 ? value : null;
}

/**
 * Single place that decides what a reading looks like as text.
 * Rule: only status "live" with a valid value is shown as a current number.
 * Missing, unsupported, unknown or errored data is never rendered as 0.
 */
export function describeReading(reading: Reading, now: number, decimals = 0): ReadingView {
  switch (reading.status) {
    case 'live': {
      const text = valueToText(reading.value, decimals);
      if (text === null) {
        return { valueText: '!', unitText: '', statusLabel: 'Error', detail: 'Invalid reading', emphasized: false };
      }
      return { valueText: text, unitText: reading.unit, statusLabel: 'Live', detail: null, emphasized: true };
    }
    case 'stale': {
      const text = valueToText(reading.value, decimals);
      const detail =
        reading.timestamp === null ? 'Stale' : `Stale · ${formatAge(now - reading.timestamp)}`;
      return {
        valueText: text ?? '—',
        unitText: text === null ? '' : reading.unit,
        statusLabel: 'Stale',
        detail,
        emphasized: false,
      };
    }
    case 'unsupported':
      return { valueText: '—', unitText: '', statusLabel: 'Unsupported', detail: 'Unsupported by this vehicle', emphasized: false };
    case 'unknown':
      return { valueText: '…', unitText: '', statusLabel: 'Checking', detail: 'Checking support', emphasized: false };
    case 'error':
      return {
        valueText: '!',
        unitText: '',
        statusLabel: 'Error',
        detail: reading.error?.message ?? 'No response',
        emphasized: false,
      };
  }
}
