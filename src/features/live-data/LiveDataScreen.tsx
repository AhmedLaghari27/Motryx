import React from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { describeAdapterError } from '@/core/obd/adapter/errors';
import { hex2 } from '@/core/obd/decoder/mode01';
import { groupSupportedSensors } from '@/core/obd/discovery/groupSensors';
import type { SensorDef } from '@/core/obd/pid-registry/registry';
import { Badge, EmptyState, ErrorState, LoadingState, Screen, Text } from '@/components';
import { MAX_RANGES, useDiscoveryStore } from '@/state/discovery.store';
import { useConnectionStore } from '@/state/connection.store';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

function SensorRow({ sensor }: { sensor: SensorDef }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.rowText}>
        <Text>{sensor.label}</Text>
        <Text variant="caption" tone="secondary">
          PID {hex2(sensor.pid)} · {sensor.source}
        </Text>
      </View>
      <Text variant="unit" tone="secondary">
        {sensor.unit}
      </Text>
    </View>
  );
}

/**
 * Step 5 shows what the car REPORTS it supports. Live values and favorites arrive in the next step.
 * Nothing is listed unless the car said it supports it.
 */
export function LiveDataScreen() {
  const connection = useConnectionStore((s) => s.state);
  const target = useConnectionStore((s) => s.target);
  const status = useDiscoveryStore((s) => s.status);
  const progress = useDiscoveryStore((s) => s.progress);
  const capabilities = useDiscoveryStore((s) => s.capabilities);
  const warnings = useDiscoveryStore((s) => s.warnings);
  const error = useDiscoveryStore((s) => s.error);
  const run = useDiscoveryStore((s) => s.run);

  if (connection !== 'connected') {
    return (
      <Screen>
        <EmptyState
          icon="live"
          title="No live data yet"
          message="Connect an adapter to see which sensors your car supports."
        />
      </Screen>
    );
  }

  if (status === 'error' && error) {
    const copy = describeAdapterError(error.code);
    return (
      <Screen>
        <ErrorState title={copy.title} message={copy.message} actionLabel="Try again" onAction={() => void run()} />
      </Screen>
    );
  }

  if (status !== 'ready' || !capabilities) {
    return (
      <Screen>
        <LoadingState
          label="Checking supported sensors"
          message={`Checking which sensors your car reports… (${progress} of up to ${MAX_RANGES})`}
        />
      </Screen>
    );
  }

  const grouped = groupSupportedSensors(capabilities);
  const total = capabilities.supportedPids.length;

  return (
    <Screen>
      <SectionList
        sections={grouped.sections}
        keyExtractor={(sensor) => sensor.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            {target?.simulated ? <Badge label="Simulated adapter · not real car data" tone="warn" /> : null}
            <Text variant="headline">Your car reports {total} {total === 1 ? 'sensor' : 'sensors'}</Text>
            <Text tone="secondary">
              Motryx can read {grouped.readableCount} of them.
              {grouped.unreadablePids.length > 0
                ? ` ${grouped.unreadablePids.length} more ${grouped.unreadablePids.length === 1 ? 'item is' : 'items are'} reported but not readable yet.`
                : ''}
            </Text>
            {warnings.map((w) => (
              <Text key={w} tone="warn">
                {w}
              </Text>
            ))}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text variant="label" tone="secondary" style={styles.section}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => <SensorRow sensor={item} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.xl },
  header: { gap: spacing.sm, paddingBottom: spacing.md },
  section: { marginTop: spacing.lg, marginBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 2 },
});
