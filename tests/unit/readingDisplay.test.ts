import type { Reading } from '@/types/telemetry';
import { describeReading, formatAge } from '@/utils/readingDisplay';

const NOW = 1_000_000;
const base: Reading = { sensorId: 's', value: 90, unit: '°C', status: 'live', source: 'OBD-II Mode 01', timestamp: NOW };

describe('describeReading', () => {
  it('shows a live value at full emphasis', () => {
    expect(describeReading(base, NOW)).toMatchObject({ valueText: '90', unitText: '°C', statusLabel: 'Live', emphasized: true });
  });

  it('shows a genuine live zero as 0', () => {
    expect(describeReading({ ...base, value: 0 }, NOW).valueText).toBe('0');
  });

  it('treats a live reading without a valid value as an error', () => {
    for (const value of [null, NaN, '']) {
      const v = describeReading({ ...base, value }, NOW);
      expect(v.valueText).toBe('!');
      expect(v.emphasized).toBe(false);
    }
  });

  it('dims stale data and states its age', () => {
    const v = describeReading({ ...base, status: 'stale', timestamp: NOW - 4000 }, NOW);
    expect(v).toMatchObject({ valueText: '90', statusLabel: 'Stale', detail: 'Stale · 4 s ago', emphasized: false });
  });

  it('never renders unsupported, unknown or errored data as a number', () => {
    for (const status of ['unsupported', 'unknown', 'error'] as const) {
      const v = describeReading({ ...base, value: 0, status }, NOW);
      expect(v.valueText).not.toBe('0');
      expect(v.emphasized).toBe(false);
      expect(v.unitText).toBe('');
    }
  });

  it('explains the cause of an error', () => {
    const v = describeReading({ ...base, status: 'error', value: null, error: { code: 'TIMEOUT', message: 'Adapter timed out' } }, NOW);
    expect(v.detail).toBe('Adapter timed out');
    expect(describeReading({ ...base, status: 'error', value: null }, NOW).detail).toBe('No response');
  });

  it('labels unsupported readings plainly', () => {
    expect(describeReading({ ...base, status: 'unsupported', value: null }, NOW).detail).toBe('Unsupported by this vehicle');
  });
});

describe('formatAge', () => {
  it('formats ranges', () => {
    expect(formatAge(400)).toBe('just now');
    expect(formatAge(4000)).toBe('4 s ago');
    expect(formatAge(125_000)).toBe('2 min ago');
    expect(formatAge(7_300_000)).toBe('2 h ago');
    expect(formatAge(-5)).toBe('just now');
  });
});
