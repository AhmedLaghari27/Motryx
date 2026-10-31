import type { PermissionKind, PermissionStatus } from '@/core/permissions/types';

export type PlatformInfo = { os: 'android' | 'ios' | 'other'; apiLevel?: number };

export type Rationale = {
  icon: 'bluetooth' | 'location';
  title: string;
  why: string;
  assurance: string;
  note: string | null;
};

/** Plain-language reasons shown BEFORE the system prompt, only when a feature needs the permission. */
export function getRationale(kind: PermissionKind, platform: PlatformInfo): Rationale {
  if (kind === 'location') {
    return {
      icon: 'location',
      title: 'Allow location for GPS speed',
      why: 'Motryx uses your location to measure speed, distance and run times.',
      assurance: 'Only while the app is open. Your location stays on this phone.',
      note: 'Choose “Precise” if asked. Approximate location cannot time runs accurately.',
    };
  }

  let note: string | null = null;
  if (platform.os === 'ios') {
    note = 'Your iPhone will ask for Bluetooth access the first time you scan.';
  } else if (platform.os === 'android') {
    note =
      (platform.apiLevel ?? 0) >= 31
        ? 'Android lists this permission as “Nearby devices”.'
        : 'On this version of Android, scanning for Bluetooth devices needs the location permission. Motryx does not use it to track you.';
  }

  return {
    icon: 'bluetooth',
    title: 'Allow Bluetooth to find your adapter',
    why: 'Motryx uses Bluetooth only to find your OBD-II adapter and read data from it.',
    assurance: 'It does not connect to any other device.',
    note,
  };
}

export function statusLabel(status: PermissionStatus | 'checking'): string {
  switch (status) {
    case 'checking':
      return 'Checking…';
    case 'granted':
      return 'Allowed';
    case 'deferred':
      return 'Asked when you first scan';
    case 'undetermined':
      return 'Not asked yet';
    case 'denied':
      return 'Not allowed';
    case 'blocked':
      return 'Blocked in system settings';
    case 'unavailable':
      return 'Unavailable on this phone';
  }
}

/** Explains a denied, blocked or unavailable result and what to do next. */
export function statusMessage(status: PermissionStatus | 'checking'): string | null {
  switch (status) {
    case 'denied':
      return 'Permission was not granted. You can try again.';
    case 'blocked':
      return 'This permission is blocked. Turn it on in your phone’s settings, then come back.';
    case 'unavailable':
      return 'This phone cannot provide this permission.';
    default:
      return null;
  }
}

/** Label for the single next action, or null when there is nothing to do. */
export function actionLabel(kind: PermissionKind, status: PermissionStatus | 'checking'): string | null {
  switch (status) {
    case 'undetermined':
      return kind === 'bluetooth' ? 'Allow Bluetooth' : 'Allow location';
    case 'denied':
      return 'Try again';
    case 'blocked':
      return 'Open settings';
    default:
      return null;
  }
}
