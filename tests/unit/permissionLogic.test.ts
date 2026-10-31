import {
  androidBluetoothPermissions,
  isUsable,
  mapAndroidResults,
  mapExpoLocation,
  reconcileStatus,
} from '@/core/permissions/logic';

describe('androidBluetoothPermissions', () => {
  it('uses Nearby devices permissions on Android 12+', () => {
    expect(androidBluetoothPermissions(31)).toEqual(['BLUETOOTH_SCAN', 'BLUETOOTH_CONNECT']);
    expect(androidBluetoothPermissions(34)).toEqual(['BLUETOOTH_SCAN', 'BLUETOOTH_CONNECT']);
  });
  it('needs location to scan on older Android', () => {
    expect(androidBluetoothPermissions(30)).toEqual(['ACCESS_FINE_LOCATION']);
  });
});

describe('mapAndroidResults', () => {
  it('is granted only when every permission is granted', () => {
    expect(mapAndroidResults({ a: 'granted', b: 'granted' })).toBe('granted');
  });
  it('is blocked if any permission is never_ask_again', () => {
    expect(mapAndroidResults({ a: 'granted', b: 'never_ask_again' })).toBe('blocked');
  });
  it('is denied when something was denied but can be asked again', () => {
    expect(mapAndroidResults({ a: 'granted', b: 'denied' })).toBe('denied');
  });
  it('is unavailable when there is nothing to ask', () => {
    expect(mapAndroidResults({})).toBe('unavailable');
  });
});

describe('mapExpoLocation', () => {
  it('maps each state', () => {
    expect(mapExpoLocation({ status: 'granted', canAskAgain: true })).toBe('granted');
    expect(mapExpoLocation({ status: 'denied', canAskAgain: true })).toBe('denied');
    expect(mapExpoLocation({ status: 'denied', canAskAgain: false })).toBe('blocked');
    expect(mapExpoLocation({ status: 'undetermined', canAskAgain: true })).toBe('undetermined');
  });
});

describe('reconcileStatus', () => {
  it('keeps denied or blocked when a re-check cannot tell the difference', () => {
    expect(reconcileStatus('denied', 'undetermined')).toBe('denied');
    expect(reconcileStatus('blocked', 'undetermined')).toBe('blocked');
  });
  it('accepts real changes, such as granting in system settings', () => {
    expect(reconcileStatus('blocked', 'granted')).toBe('granted');
    expect(reconcileStatus('checking', 'undetermined')).toBe('undetermined');
  });
});

describe('isUsable', () => {
  it('treats granted and deferred as usable, nothing else', () => {
    expect(isUsable('granted')).toBe(true);
    expect(isUsable('deferred')).toBe(true);
    for (const s of ['undetermined', 'denied', 'blocked', 'unavailable', 'checking'] as const) {
      expect(isUsable(s)).toBe(false);
    }
  });
});
