import type { KeyValueStorage } from '@/data/kvStorage';
import { DEFAULT_PREFERENCES, loadPreferences, savePreferences } from '@/data/repositories/preferencesRepository';
import { toggleId } from '@/utils/lists';
import { toDisplayReading } from '@/utils/readingDisplay';
import { convertForDisplay } from '@/utils/units';
import type { Reading } from '@/types/telemetry';

const memory = (initial: Record<string, string> = {}): KeyValueStorage => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  };
};
const KEY = 'motryx.prefs.v1';

describe('preferences repository', () => {
  it('returns defaults when nothing is saved', async () => {
    expect(await loadPreferences(memory())).toEqual(DEFAULT_PREFERENCES);
  });

  it('round-trips what was saved', async () => {
    const storage = memory();
    const prefs = { ...DEFAULT_PREFERENCES, unitSystem: 'imperial' as const, favorites: ['engine.rpm'], dashboard: ['temp.coolant', 'engine.rpm'] };
    await savePreferences(storage, prefs);
    expect(await loadPreferences(storage)).toEqual(prefs);
  });

  it('falls back to defaults on corrupt or invalid data', async () => {
    expect(await loadPreferences(memory({ [KEY]: '{oops' }))).toEqual(DEFAULT_PREFERENCES);
    expect(await loadPreferences(memory({ [KEY]: '{"version":1,"unitSystem":"martian","favorites":[],"dashboard":[]}' }))).toEqual(DEFAULT_PREFERENCES);
    expect(await loadPreferences(memory({ [KEY]: '{"version":1,"unitSystem":"metric","favorites":[1],"dashboard":[]}' }))).toEqual(DEFAULT_PREFERENCES);
  });

  it('survives a failing storage', async () => {
    const broken: KeyValueStorage = { getItem: async () => { throw new Error('x'); }, setItem: async () => undefined, removeItem: async () => undefined };
    expect(await loadPreferences(broken)).toEqual(DEFAULT_PREFERENCES);
  });
});

describe('toggleId', () => {
  it('adds, removes, and keeps order without changing the input', () => {
    const list = ['a', 'b'];
    expect(toggleId(list, 'c')).toEqual(['a', 'b', 'c']);
    expect(toggleId(list, 'a')).toEqual(['b']);
    expect(list).toEqual(['a', 'b']);
  });
});

describe('display units', () => {
  it('leaves metric values alone', () => {
    expect(convertForDisplay('°C', 90, 'metric')).toEqual({ value: 90, unit: '°C' });
  });
  it('converts to imperial where there is an imperial unit', () => {
    expect(convertForDisplay('°C', 100, 'imperial')).toEqual({ value: 212, unit: '°F' });
    expect(convertForDisplay('km/h', 160.9344, 'imperial').unit).toBe('mph');
    expect(convertForDisplay('kPa', 100, 'imperial').unit).toBe('psi');
    expect(convertForDisplay('km', 160.9344, 'imperial')).toEqual({ value: 100, unit: 'mi' });
  });
  it('leaves units without an imperial form unchanged', () => {
    expect(convertForDisplay('rpm', 2000, 'imperial')).toEqual({ value: 2000, unit: 'rpm' });
    expect(convertForDisplay('%', 50, 'imperial')).toEqual({ value: 50, unit: '%' });
  });

  const reading = (over: Partial<Reading>): Reading => ({ sensorId: 's', value: 100, unit: '°C', status: 'live', source: 't', timestamp: 1, ...over });
  it('converts live and stale readings only', () => {
    expect(toDisplayReading(reading({}), 'imperial')).toMatchObject({ value: 212, unit: '°F' });
    expect(toDisplayReading(reading({ status: 'stale' }), 'imperial')).toMatchObject({ value: 212, unit: '°F' });
    const error = reading({ status: 'error', value: null });
    expect(toDisplayReading(error, 'imperial')).toBe(error);
    const unsupported = reading({ status: 'unsupported', value: null });
    expect(toDisplayReading(unsupported, 'imperial')).toBe(unsupported);
  });
});
