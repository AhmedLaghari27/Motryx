import React from 'react';
import { StyleSheet, View } from 'react-native';
import { statusColor } from '@/theme/statusColor';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import type { ReadingStatus } from '@/types/telemetry';
import { Text } from './Text';

type Props = { status: ReadingStatus; label: string };

/** Status is always text plus color, never color alone. */
export function ReadingStatusPill({ status, label }: Props) {
  const { colors } = useTheme();
  const color = statusColor(colors, status);
  return (
    <View style={[styles.pill, { backgroundColor: `${color}22` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text variant="caption" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.chip,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
