import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/routes';
import { Button, EmptyState, ErrorState, LoadingState, Screen } from '@/components';
import { useVehicleStore } from '@/state/vehicle.store';
import { spacing } from '@/theme/tokens';
import { tapHaptic } from '@/utils/haptics';
import { VehicleCard } from './VehicleCard';

export function GarageScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const status = useVehicleStore((s) => s.status);
  const vehicles = useVehicleStore((s) => s.vehicles);
  const activeId = useVehicleStore((s) => s.activeId);
  const load = useVehicleStore((s) => s.load);
  const addUnknown = useVehicleStore((s) => s.addUnknown);
  const setActive = useVehicleStore((s) => s.setActive);

  if (status === 'error') {
    return (
      <Screen>
        <ErrorState
          title="Could not open your garage"
          message="Your saved vehicles could not be read. Close other apps and try again."
          actionLabel="Try again"
          onAction={() => void load()}
        />
      </Screen>
    );
  }

  if (status === 'idle' || status === 'loading') {
    return (
      <Screen>
        <LoadingState label="Opening your garage" />
      </Screen>
    );
  }

  if (vehicles.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="garage"
          title="No vehicles yet"
          message="Add your car to keep its readings and sessions together. Not sure of the details? That is fine."
          actionLabel="Add vehicle"
          onAction={() => navigation.navigate('VehicleForm')}
          secondaryActionLabel="Use an unknown vehicle"
          onSecondaryAction={() => void addUnknown()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={vehicles}
        keyExtractor={(v) => v.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <VehicleCard
            vehicle={item}
            active={item.id === activeId}
            onEdit={() => navigation.navigate('VehicleForm', { vehicleId: item.id })}
            onMakeActive={() => {
              tapHaptic();
              void setActive(item.id);
            }}
          />
        )}
      />
      <Button label="Add vehicle" onPress={() => navigation.navigate('VehicleForm')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: { gap: spacing.md, paddingBottom: spacing.md },
});
