import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useConnectionStore } from '@/state/connection.store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import type { ConnectionState } from '@/types/telemetry';
import { Text } from './Text';
import { usePulse } from './usePulse';

type Tone = 'live' | 'warn' | 'error' | 'stale';

const BADGE: Record<ConnectionState, { text: string; tone: Tone; busy: boolean }> = {
  idle: { text: 'Not connected', tone: 'stale', busy: false },
  scanning: { text: 'Scanning', tone: 'warn', busy: true },
  connecting: { text: 'Connecting', tone: 'warn', busy: true },
  initializing: { text: 'Setting up', tone: 'warn', busy: true },
  connected: { text: 'Connected', tone: 'live', busy: false },
  reconnecting: { text: 'Reconnecting', tone: 'warn', busy: true },
  disconnected: { text: 'Disconnected', tone: 'error', busy: false },
  error: { text: 'Adapter error', tone: 'error', busy: false },
};

/** Visible on every primary screen. Reads real connection state; idle until an adapter connects. */
export function ConnectionBadge() {
  const state = useConnectionStore((s) => s.state);
  const { colors } = useTheme();
  const { text, tone, busy } = BADGE[state];
  const color = colors[tone];
  const pulse = usePulse(busy);

  return (
    <View
      accessible
      accessibilityLabel={`Adapter status: ${text}`}
      style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Animated.View style={[styles.dot, { backgroundColor: color }, pulse]} />
      <Text variant="caption" tone="secondary">
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm - 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.chip,
    borderWidth: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
