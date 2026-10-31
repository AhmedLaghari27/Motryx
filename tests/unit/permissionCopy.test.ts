import { actionLabel, getRationale, statusLabel, statusMessage } from '@/features/permissions/copy';

describe('getRationale', () => {
  it('explains location with the precise-location hint', () => {
    const r = getRationale('location', { os: 'android', apiLevel: 34 });
    expect(r.why).toMatch(/speed/);
    expect(r.note).toMatch(/Precise/);
  });
  it('explains the location requirement on older Android Bluetooth scanning', () => {
    expect(getRationale('bluetooth', { os: 'android', apiLevel: 30 }).note).toMatch(/location/i);
  });
  it('mentions Nearby devices on Android 12+', () => {
    expect(getRationale('bluetooth', { os: 'android', apiLevel: 33 }).note).toMatch(/Nearby devices/);
  });
  it('tells iPhone users the system asks on first scan', () => {
    expect(getRationale('bluetooth', { os: 'ios' }).note).toMatch(/first time you scan/);
  });
});

describe('status helpers', () => {
  it('gives every status a label', () => {
    for (const s of ['checking', 'granted', 'deferred', 'undetermined', 'denied', 'blocked', 'unavailable'] as const) {
      expect(statusLabel(s).length).toBeGreaterThan(0);
    }
  });
  it('only offers an action when there is something to do', () => {
    expect(actionLabel('bluetooth', 'undetermined')).toBe('Allow Bluetooth');
    expect(actionLabel('location', 'undetermined')).toBe('Allow location');
    expect(actionLabel('location', 'denied')).toBe('Try again');
    expect(actionLabel('location', 'blocked')).toBe('Open settings');
    expect(actionLabel('location', 'granted')).toBeNull();
    expect(actionLabel('bluetooth', 'unavailable')).toBeNull();
  });
  it('explains problems and stays quiet otherwise', () => {
    expect(statusMessage('blocked')).toMatch(/settings/);
    expect(statusMessage('denied')).toMatch(/try again/);
    expect(statusMessage('granted')).toBeNull();
  });
});
