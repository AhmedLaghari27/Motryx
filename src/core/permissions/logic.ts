import type { PermissionStatus } from './types';

/** Pure permission rules, kept free of React Native so they are unit-tested. */

export type AndroidPermissionName = 'BLUETOOTH_SCAN' | 'BLUETOOTH_CONNECT' | 'ACCESS_FINE_LOCATION';
export type AndroidRequestResult = 'granted' | 'denied' | 'never_ask_again';

export const ANDROID_12_API_LEVEL = 31;

/** Android 12+ uses "Nearby devices"; older versions need location to scan for Bluetooth. */
export function androidBluetoothPermissions(apiLevel: number): AndroidPermissionName[] {
  return apiLevel >= ANDROID_12_API_LEVEL ? ['BLUETOOTH_SCAN', 'BLUETOOTH_CONNECT'] : ['ACCESS_FINE_LOCATION'];
}

export function mapAndroidResults(results: Record<string, AndroidRequestResult>): PermissionStatus {
  const values = Object.values(results);
  if (values.length === 0) return 'unavailable';
  if (values.every((v) => v === 'granted')) return 'granted';
  if (values.some((v) => v === 'never_ask_again')) return 'blocked';
  return 'denied';
}

export function mapExpoLocation(result: { status: string; canAskAgain: boolean }): PermissionStatus {
  if (result.status === 'granted') return 'granted';
  if (result.status === 'denied') return result.canAskAgain ? 'denied' : 'blocked';
  return 'undetermined';
}

/**
 * Android cannot tell "never asked" from "denied" when only checking. After the user has
 * denied or blocked, a re-check must not fall back to "undetermined".
 */
export function reconcileStatus(previous: PermissionStatus | 'checking', next: PermissionStatus): PermissionStatus {
  if (next === 'undetermined' && (previous === 'denied' || previous === 'blocked')) return previous;
  return next;
}

export function isUsable(status: PermissionStatus | 'checking'): boolean {
  return status === 'granted' || status === 'deferred';
}
