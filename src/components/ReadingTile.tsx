import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import type { Reading, ReadingStatus } from '@/types/telemetry';
import { describeReading } from '@/utils/readingDisplay';
import { ReadingStatusPill } from './ReadingStatusPill';
import { Skeleton } from './Skeleton';
import { Text, type TextTone } from './Text';

type Props = {
  label: string;
  reading: Reading;
  now: number;
  decimals?: number;
  style?: StyleProp<ViewStyle>;
};

const VALUE_TONE: Record<ReadingStatus, TextTone> = {
  live: 'primary',
  stale: 'stale',
  unsupported: 'disabled',
  unknown: 'secondary',
  error: 'error',
};

/**
 * One sensor, in one of five honest states. Value, unit, status and source all come
 * from the same Reading so they can never disagree.
 */
export const ReadingTile = React.memo(function ReadingTile({ label, reading, now, decimals = 0, style }: Props) {
  const { colors } = useTheme();
  const view = describeReading(reading, now, decimals);

  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${view.valueText} ${view.unitText}, ${view.statusLabel}`.replace(/\s+/g, ' ')}
      style={[
        styles.tile,
        {
          backgroundColor: colors.surface,
          borderColor: reading.status === 'error' ? colors.error : colors.border,
          borderStyle: reading.status === 'stale' ? 'dashed' : 'solid',
        },
        style,
      ]}
    >
      <Text variant="label" tone="secondary" numberOfLines={1}>
        {label}
      </Text>

      <View style={styles.valueRow}>
        {reading.status === 'unknown' ? (
          <Skeleton width={72} height={36} />
        ) : (
          <Text variant="value" numeric tone={VALUE_TONE[reading.status]} numberOfLines={1} adjustsFontSizeToFit>
            {view.valueText}
          </Text>
        )}
        {view.unitText ? (
          <Text variant="unit" tone="secondary">
            {view.unitText}
          </Text>
        ) : null}
      </View>

      <ReadingStatusPill status={reading.status} label={view.statusLabel} />
      <Text variant="caption" tone={reading.status === 'error' ? 'error' : 'secondary'} numberOfLines={2}>
        {view.detail ?? reading.source}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  tile: { borderRadius: radius.tile, borderWidth: 1, padding: spacing.lg, gap: spacing.sm, minHeight: 132 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs + 2, minHeight: 40 },
});
