import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  ReadingTile,
  Screen,
  Text,
  type IconName,
} from '@/components';
import { makePreviewReadings } from '@/mock/readings';
import { spacing } from '@/theme/tokens';
import { useNow } from '@/utils/useNow';

const ICONS: IconName[] = ['cockpit', 'live', 'diagnostics', 'garage', 'settings', 'alert', 'inbox'];

/** Developer-only gallery. Registered only when __DEV__ is true. */
export default function DesignPreviewScreen() {
  const now = useNow(1000);
  const [mountedAt] = useState(() => Date.now());
  const readings = useMemo(() => makePreviewReadings(mountedAt), [mountedAt]);
  const [loading, setLoading] = useState(false);

  return (
    <Screen scroll>
      <Text variant="title">Reading states</Text>
      <View style={styles.grid}>
        {Object.values(readings).map(({ label, reading }) => (
          <ReadingTile key={reading.sensorId} label={label} reading={reading} now={now} style={styles.tile} />
        ))}
      </View>

      <Text variant="title">Typography</Text>
      <Card>
        <Text variant="hero" numeric>
          2450
        </Text>
        <Text variant="value" numeric>
          92.4 <Text variant="unit" tone="secondary">°C</Text>
        </Text>
        <Text variant="title">Section title</Text>
        <Text>Body text for explanations and descriptions.</Text>
        <Text variant="label" tone="secondary">Label</Text>
        <Text variant="caption" tone="secondary">Caption and source text</Text>
      </Card>

      <Text variant="title">Buttons</Text>
      <Card>
        <Button label="Primary" onPress={() => undefined} />
        <Button label="Secondary" variant="secondary" onPress={() => undefined} />
        <Button label="Ghost" variant="ghost" onPress={() => undefined} />
        <Button label="Destructive" variant="destructive" onPress={() => undefined} />
        <Button label="Loading" loading={loading} onPress={() => setLoading((v) => !v)} />
        <Button label="Disabled" disabled onPress={() => undefined} />
      </Card>

      <Text variant="title">Icons</Text>
      <Card>
        <View style={styles.icons}>
          {ICONS.map((name) => (
            <Icon key={name} name={name} size={28} />
          ))}
        </View>
      </Card>

      <Text variant="title">Empty, error, loading</Text>
      <Card style={styles.stateCard}>
        <EmptyState title="Nothing here yet" message="Plain sentence that says what to do next." actionLabel="Do the thing" onAction={() => undefined} />
      </Card>
      <Card style={styles.stateCard}>
        <ErrorState title="Adapter not found" message="Turn on the adapter, then scan again." actionLabel="Scan again" onAction={() => undefined} />
      </Card>
      <Card style={styles.stateCard}>
        <LoadingState label="Discovering sensors" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { flexBasis: '47%', flexGrow: 1 },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  stateCard: { minHeight: 220 },
});
