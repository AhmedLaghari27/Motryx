import React, { useCallback, useMemo, useRef, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { describeAdapterError } from '@/core/obd/adapter/errors';
import type { VehicleCapabilities } from '@/core/obd/discovery/capabilities';
import { poller } from '@/core/telemetry/instances';
import { Badge, Chip, EmptyState, ErrorState, LoadingState, Screen, Text, TextField } from '@/components';
import { MAX_RANGES, useDiscoveryStore } from '@/state/discovery.store';
import { useConnectionStore } from '@/state/connection.store';
import { usePreferencesStore } from '@/state/preferences.store';
import { spacing } from '@/theme/tokens';
import { useNow } from '@/utils/useNow';
import { buildCatalog, filterCatalog, type CatalogItem } from './catalog';
import { SensorRow } from './SensorRow';

const VIEWABILITY = { itemVisiblePercentThreshold: 30 } as const;
const OWNER = 'live-data';

/** The part of the list's viewability callback we use. */
type ViewableChange = { viewableItems: { item?: unknown }[] };

/** Waits for a connection and for discovery, then shows the catalogue. */
export function LiveDataScreen() {
  const connection = useConnectionStore((s) => s.state);
  const status = useDiscoveryStore((s) => s.status);
  const progress = useDiscoveryStore((s) => s.progress);
  const capabilities = useDiscoveryStore((s) => s.capabilities);
  const error = useDiscoveryStore((s) => s.error);
  const run = useDiscoveryStore((s) => s.run);

  if (connection !== 'connected') {
    return (
      <Screen>
        <EmptyState icon="live" title="No live data yet" message="Connect an adapter to see which sensors your car supports." />
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

  return <Catalogue capabilities={capabilities} />;
}

function Catalogue({ capabilities }: { capabilities: VehicleCapabilities }) {
  const target = useConnectionStore((s) => s.target);
  const warnings = useDiscoveryStore((s) => s.warnings);
  const { unitSystem, favorites, dashboard } = usePreferencesStore((s) => s.prefs);
  const toggleFavorite = usePreferencesStore((s) => s.toggleFavorite);
  const toggleDashboard = usePreferencesStore((s) => s.toggleDashboard);

  const [query, setQuery] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [showUnsupported, setShowUnsupported] = useState(false);
  const now = useNow(1000);

  const items = useMemo(() => buildCatalog(capabilities), [capabilities]);
  const supportedCount = items.filter((i) => i.availability === 'supported').length;
  const hiddenCount = items.length - supportedCount;
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const dashboardSet = useMemo(() => new Set(dashboard), [dashboard]);
  const sections = useMemo(
    () => filterCatalog(items, { query, favoritesOnly, showUnsupported }, favoriteSet),
    [items, query, favoritesOnly, showUnsupported, favoriteSet],
  );

  // Poll only what is on screen, and only while this tab is open.
  const visiblePids = useRef<number[]>([]);
  const onViewableItemsChanged = useCallback(({ viewableItems }: ViewableChange) => {
    visiblePids.current = viewableItems.flatMap((token) => {
      const item = token.item as CatalogItem | undefined;
      return item && item.availability === 'supported' ? [item.sensor.pid] : [];
    });
    poller.setInterest(OWNER, visiblePids.current, 'background');
  }, []);
  useFocusEffect(
    useCallback(() => {
      poller.setInterest(OWNER, visiblePids.current, 'background');
      return () => poller.clearInterest(OWNER);
    }, []),
  );

  const emptyMessage = favoritesOnly
    ? 'No favorites yet. Tap the star on a sensor to add it.'
    : 'No sensors match your search.';

  return (
    <Screen>
      <View style={styles.top}>
        {target?.simulated ? <Badge label="Simulated adapter · not real car data" tone="warn" /> : null}
        <Text tone="secondary">
          {supportedCount} sensors reported · {unitSystem === 'metric' ? 'metric' : 'imperial'} units
        </Text>
        {warnings.map((w) => (
          <Text key={w} tone="warn">
            {w}
          </Text>
        ))}
        <TextField
          label="Search sensors"
          value={query}
          onChangeText={setQuery}
          placeholder="Name, category or PID, like “coolant” or “0C”"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        <View style={styles.chips}>
          <Chip label="All" selected={!favoritesOnly} onPress={() => setFavoritesOnly(false)} />
          <Chip label="Favorites" selected={favoritesOnly} onPress={() => setFavoritesOnly(true)} />
          {hiddenCount > 0 ? (
            <Chip
              label={showUnsupported ? 'Hide unsupported' : `Show unsupported (${hiddenCount})`}
              selected={showUnsupported}
              onPress={() => setShowUnsupported((v) => !v)}
            />
          ) : null}
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.sensor.id}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text tone="secondary" style={styles.empty}>
            {emptyMessage}
          </Text>
        }
        renderSectionHeader={({ section }) => (
          <Text variant="label" tone="secondary" style={styles.section}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <SensorRow
            item={item}
            now={now}
            system={unitSystem}
            favorite={favoriteSet.has(item.sensor.id)}
            onCockpit={dashboardSet.has(item.sensor.id)}
            onToggleFavorite={toggleFavorite}
            onToggleCockpit={toggleDashboard}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  list: { paddingBottom: spacing.xl },
  section: { marginTop: spacing.lg, marginBottom: spacing.xs },
  empty: { paddingVertical: spacing.xl, textAlign: 'center' },
});
