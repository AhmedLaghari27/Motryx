import * as Haptics from 'expo-haptics';

/** Light, optional feedback. Failures are ignored: haptics must never break a flow. */
export function tapHaptic(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}
export function successHaptic(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}
export function warningHaptic(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
}
