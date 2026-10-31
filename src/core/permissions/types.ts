export type PermissionKind = 'bluetooth' | 'location';

/**
 * - undetermined: not granted yet, and we can still ask
 * - denied:       user said no, we can ask again
 * - blocked:      user said no for good; only system settings can change it
 * - deferred:     the OS asks on first use (iPhone Bluetooth); the BLE layer reports the outcome
 * - unavailable:  this phone or platform cannot provide it
 */
export type PermissionStatus = 'granted' | 'deferred' | 'undetermined' | 'denied' | 'blocked' | 'unavailable';
