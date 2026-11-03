import { readingFromReply } from '@/core/obd/polling/reading';
import {
  BACKGROUND_FACTOR,
  DEFAULT_INTERVALS,
  MAX_RETRY_MS,
  MIN_STALE_MS,
  baseIntervalMs,
  pollClassFor,
  retryDelayMs,
  staleAfterMs,
} from '@/core/obd/polling/pollConfig';
import { getSensorByPid } from '@/core/obd/pid-registry/registry';
import type { CommandResult } from '@/core/obd/adapter/responses';

const rpm = getSensorByPid(0x0c)!;

describe('poll configuration', () => {
  it('asks fast sensors often and slow sensors rarely', () => {
    expect(pollClassFor(0x0c)).toBe('fast');
    expect(pollClassFor(0x05)).toBe('slow');
    expect(pollClassFor(0x06)).toBe('normal');
    expect(baseIntervalMs(0x0c, 'foreground')).toBeLessThan(baseIntervalMs(0x06, 'foreground'));
    expect(baseIntervalMs(0x06, 'foreground')).toBeLessThan(baseIntervalMs(0x05, 'foreground'));
  });

  it('asks less often for sensors that are merely visible', () => {
    expect(baseIntervalMs(0x0c, 'background')).toBe(DEFAULT_INTERVALS.fast * BACKGROUND_FACTOR);
  });

  it('backs off after failures, but never beyond the cap', () => {
    expect(retryDelayMs(250, 1)).toBe(500);
    expect(retryDelayMs(250, 2)).toBe(1000);
    expect(retryDelayMs(250, 50)).toBe(MAX_RETRY_MS);
  });

  it('allows three missed updates, never sooner than 2 s, and more when the adapter is slow', () => {
    expect(staleAfterMs(250, null)).toBe(MIN_STALE_MS);
    expect(staleAfterMs(1000, null)).toBe(3000);
    expect(staleAfterMs(250, 2000)).toBe(6000);
  });
});

describe('readingFromReply', () => {
  const ok = (lines: string[]): CommandResult => ({ ok: true, lines });
  const bad = (error: Extract<CommandResult, { ok: false }>['error']): CommandResult => ({ ok: false, error, lines: [] });

  it('makes a live reading from a clean reply', () => {
    expect(readingFromReply(rpm, ok(['41 0C 1A F8']), 5000)).toEqual({
      sensorId: 'engine.rpm', value: 1726, unit: 'rpm', status: 'live', source: 'OBD-II Mode 01', timestamp: 5000,
    });
  });

  it('never turns a bad reply into a number', () => {
    expect(readingFromReply(rpm, ok(['41 0D 3C']), 1)).toMatchObject({ status: 'error', value: null, error: { code: 'MALFORMED' } });
    expect(readingFromReply(rpm, ok(['41 0C']), 1)).toMatchObject({ status: 'error', value: null });
  });

  it('reports out-of-range values as errors', () => {
    const oil = getSensorByPid(0x5c)!;
    expect(readingFromReply(oil, ok(['41 5C FF']), 1)).toMatchObject({ status: 'error', error: { code: 'OUT_OF_RANGE' } });
  });

  it('explains why a sensor did not answer', () => {
    expect(readingFromReply(rpm, bad('NO_DATA'), 1)).toMatchObject({ error: { code: 'NO_DATA', message: 'No response' } });
    expect(readingFromReply(rpm, bad('TIMEOUT'), 1)).toMatchObject({ error: { code: 'TIMEOUT' } });
    expect(readingFromReply(rpm, bad('BUS_ERROR'), 1)).toMatchObject({ error: { message: 'Communication error' } });
  });

  it('says nothing about the sensor when the link itself is down', () => {
    expect(readingFromReply(rpm, bad('DISCONNECTED'), 1)).toBeNull();
  });
});
