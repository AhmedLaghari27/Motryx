import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Button, Card, Icon, Text } from '@/components';
import type { PermissionKind, PermissionStatus } from '@/core/permissions/types';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { actionLabel, getRationale, statusMessage, type PlatformInfo } from './copy';

type Props = {
  kind: PermissionKind;
  status: PermissionStatus;
  onAllow: () => void;
  onOpenSettings: () => void;
  onNotNow?: () => void;
};

function currentPlatform(): PlatformInfo {
  if (Platform.OS === 'android') {
    const v = Platform.Version;
    return { os: 'android', apiLevel: typeof v === 'number' ? v : parseInt(String(v), 10) };
  }
  return { os: Platform.OS === 'ios' ? 'ios' : 'other' };
}

/** Explains why a permission is needed before the system prompt appears. */
export function PermissionRationale({ kind, status, onAllow, onOpenSettings, onNotNow }: Props) {
  const { colors } = useTheme();
  const rationale = getRationale(kind, currentPlatform());
  const message = statusMessage(status);
  const action = actionLabel(kind, status);

  return (
    <View style={styles.root}>
      <View style={[styles.icon, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
        <Icon name={rationale.icon} size={36} color={colors.accent} />
      </View>
      <Text variant="headline" accessibilityRole="header" style={styles.center}>
        {rationale.title}
      </Text>
      <Text tone="secondary" style={styles.center}>
        {rationale.why}
      </Text>
      <Text tone="secondary" style={styles.center}>
        {rationale.assurance}
      </Text>

      {rationale.note ? (
        <Card raised>
          <Text variant="caption" tone="secondary">
            {rationale.note}
          </Text>
        </Card>
      ) : null}

      {message ? (
        <Text tone={status === 'unavailable' ? 'error' : 'warn'} style={styles.center} accessibilityRole="alert">
          {message}
        </Text>
      ) : null}

      {action ? (
        <Button label={action} onPress={status === 'blocked' ? onOpenSettings : onAllow} />
      ) : null}
      {onNotNow ? <Button label="Not now" variant="ghost" onPress={onNotNow} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  center: { textAlign: 'center' },
  icon: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: radius.hero,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
