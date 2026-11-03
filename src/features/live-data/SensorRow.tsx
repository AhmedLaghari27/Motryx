import React from 'react';
import { StyleSheet, View } from 'react-native';
import { hex2 } from '@/core/obd/decoder/mode01';
import { useReading } from '@/core/telemetry/useReading';
import { IconButton, Text } from '@/components';
import { VALUE_TONE } from '@/components/ReadingTile';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import type { Reading } from '@/types/telemetry';
import { describeReading, toDisplayReading } from '@/utils/readingDisplay';
import type { UnitSystem } from '@/utils/units';
import type { CatalogItem } from './catalog';

type Props = {
  item: CatalogItem;
  now: number;
  system: UnitSystem;
  favorite: boolean;
  onCockpit: boolean;
  onToggleFavorite: (sensorId: string) => void;
  onToggleCockpit: (sensorId: string) => void;
};

/** One sensor row. It subscribes to its own reading, so a fast value never re-renders the list. */
export const SensorRow = React.memo(function SensorRow({
  item,
  now,
  system,
  favorite,
  onCockpit,
  onToggleFavorite,
  onToggleCockpit,
}: Props) {
  const { colors } = useTheme();
  const { sensor, availability } = item;
  const live = useReading(sensor.id);

  const supported = availability === 'supported';
  const reading: Reading =
    supported && live
      ? live
      : { sensorId: sensor.id, value: null, unit: sensor.unit, status: supported ? 'unknown' : availability, source: sensor.source, timestamp: null };

  const view = describeReading(toDisplayReading(reading, system), now, sensor.decimals);
  const waiting = supported && !live;
  const detail = waiting ? 'Waiting for the first reading' : (view.detail ?? `PID ${hex2(sensor.pid)} · ${sensor.source}`);

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View
        accessible
        accessibilityLabel={`${sensor.label}, ${waiting ? 'waiting for reading' : `${view.valueText} ${view.unitText}, ${view.statusLabel}`}`}
        style={styles.main}
      >
        <View style={styles.text}>
          <Text numberOfLines={2}>{sensor.label}</Text>
          <Text variant="caption" tone={reading.status === 'error' ? 'error' : 'secondary'} numberOfLines={2}>
            {detail}
          </Text>
        </View>
        <View style={styles.value}>
          <Text variant="title" numeric tone={waiting ? 'secondary' : VALUE_TONE[reading.status]}>
            {waiting ? '…' : view.valueText}
          </Text>
          {view.unitText ? (
            <Text variant="unit" tone="secondary">
              {view.unitText}
            </Text>
          ) : null}
        </View>
      </View>

      {supported ? (
        <View style={styles.actions}>
          <IconButton
            icon="star"
            filled={favorite}
            selected={favorite}
            label={favorite ? `Remove ${sensor.label} from favorites` : `Add ${sensor.label} to favorites`}
            onPress={() => onToggleFavorite(sensor.id)}
          />
          <IconButton
            icon={onCockpit ? 'check' : 'plus'}
            selected={onCockpit}
            label={onCockpit ? `Remove ${sensor.label} from cockpit` : `Add ${sensor.label} to cockpit`}
            onPress={() => onToggleCockpit(sensor.id)}
          />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: 2 },
  value: { alignItems: 'flex-end', minWidth: 64 },
  actions: { flexDirection: 'row' },
});
