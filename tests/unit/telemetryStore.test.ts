import { TelemetryStore } from '@/core/telemetry/TelemetryStore';
import type { Reading } from '@/types/telemetry';

const live = (sensorId: string, value: number, timestamp: number): Reading => ({
  sensorId, value, unit: 'rpm', status: 'live', source: 'test', timestamp,
});

describe('TelemetryStore', () => {
  it('stores the latest reading per sensor', () => {
    const t = new TelemetryStore();
    expect(t.get('a')).toBeUndefined();
    t.set(live('a', 1, 10));
    t.set(live('a', 2, 20));
    expect(t.get('a')?.value).toBe(2);
  });

  it('notifies only the sensor that changed', () => {
    const t = new TelemetryStore();
    const a = jest.fn();
    const b = jest.fn();
    t.subscribe('a', a);
    t.subscribe('b', b);
    t.set(live('a', 1, 10));
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
  });

  it('stops notifying after unsubscribe', () => {
    const t = new TelemetryStore();
    const a = jest.fn();
    const off = t.subscribe('a', a);
    off();
    t.set(live('a', 1, 10));
    expect(a).not.toHaveBeenCalled();
  });

  it('turns old live readings stale, and only those that are too old', () => {
    const t = new TelemetryStore();
    t.set(live('old', 1, 1000));
    t.set(live('fresh', 1, 4900));
    t.markStale(5000, () => 2000);
    expect(t.get('old')?.status).toBe('stale');
    expect(t.get('old')?.value).toBe(1); // the last value is kept, but labelled stale
    expect(t.get('fresh')?.status).toBe('live');
  });

  it('respects a different allowed age per sensor', () => {
    const t = new TelemetryStore();
    t.set(live('slow', 1, 0));
    t.set(live('fast', 1, 0));
    t.markStale(3000, (id) => (id === 'slow' ? 9000 : 2000));
    expect(t.get('slow')?.status).toBe('live');
    expect(t.get('fast')?.status).toBe('stale');
  });

  it('does not touch errors or readings that are already stale', () => {
    const t = new TelemetryStore();
    const error: Reading = { sensorId: 'e', value: null, unit: '', status: 'error', source: 't', timestamp: null, error: { code: 'NO_DATA', message: 'No response' } };
    t.set(error);
    t.markStale(99999, () => 1);
    expect(t.get('e')).toBe(error);
  });

  it('marks everything stale at once when the link drops', () => {
    const t = new TelemetryStore();
    t.set(live('a', 1, 10));
    t.set(live('b', 2, 10));
    const listener = jest.fn();
    t.subscribe('a', listener);
    t.markAllStale();
    expect(t.get('a')?.status).toBe('stale');
    expect(t.get('b')?.status).toBe('stale');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('clears readings and tells listeners', () => {
    const t = new TelemetryStore();
    t.set(live('a', 1, 10));
    const listener = jest.fn();
    t.subscribe('a', listener);
    t.clear();
    expect(t.get('a')).toBeUndefined();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
