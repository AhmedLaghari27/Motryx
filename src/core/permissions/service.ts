import { Linking, PermissionsAndroid, Platform } from 'react-native';
import * as Location from 'expo-location';
import {
  androidBluetoothPermissions,
  mapAndroidResults,
  mapExpoLocation,
  type AndroidRequestResult,
} from './logic';
import type { PermissionKind, PermissionStatus } from './types';

function androidApiLevel(): number {
  return typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
}

async function bluetoothStatus(ask: boolean): Promise<PermissionStatus> {
  if (Platform.OS === 'ios') return 'deferred'; // iOS prompts on first Bluetooth use; the BLE layer reports it
  if (Platform.OS !== 'android') return 'unavailable';

  const permissions = androidBluetoothPermissions(androidApiLevel()).map((n) => PermissionsAndroid.PERMISSIONS[n]);

  if (!ask) {
    const checks = await Promise.all(permissions.map((p) => PermissionsAndroid.check(p)));
    return checks.every(Boolean) ? 'granted' : 'undetermined';
  }
  const results = await PermissionsAndroid.requestMultiple(permissions);
  return mapAndroidResults(results as Record<string, AndroidRequestResult>);
}

async function locationStatus(ask: boolean): Promise<PermissionStatus> {
  // Phase 2 note: timing needs precise location; handle "approximate only" in the GPS step.
  const result = ask
    ? await Location.requestForegroundPermissionsAsync()
    : await Location.getForegroundPermissionsAsync();
  return mapExpoLocation(result);
}

async function resolve(kind: PermissionKind, ask: boolean): Promise<PermissionStatus> {
  try {
    return kind === 'bluetooth' ? await bluetoothStatus(ask) : await locationStatus(ask);
  } catch {
    return 'unavailable';
  }
}

export const getPermissionStatus = (kind: PermissionKind) => resolve(kind, false);
export const requestPermission = (kind: PermissionKind) => resolve(kind, true);
export const openAppSettings = () => Linking.openSettings();
