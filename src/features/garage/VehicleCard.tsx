import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { Badge, Button, Card, Text } from '@/components';
import { motion, spacing } from '@/theme/tokens';
import type { Vehicle } from '@/types/vehicle';
import { vehicleSubtitle } from '@/utils/vehicle';

type Props = {
  vehicle: Vehicle;
  active: boolean;
  onEdit: () => void;
  onMakeActive: () => void;
};

export function VehicleCard({ vehicle, active, onEdit, onMakeActive }: Props) {
  const reduce = useReducedMotion();
  const subtitle = vehicleSubtitle(vehicle);

  return (
    // Cards slide to their new place when one is removed or the list changes; skipped under reduce-motion.
    <Animated.View layout={reduce ? undefined : LinearTransition.duration(motion.duration.standard)}>
      <Card>
        <View style={styles.header}>
          <View style={styles.titles}>
            <Text variant="title" numberOfLines={1}>
              {vehicle.nickname}
            </Text>
            <Text tone="secondary" numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
          {active ? <Badge label="Active" tone="live" /> : null}
        </View>

        <View style={styles.actions}>
          {active ? null : (
            <Button
              label="Make active"
              variant="secondary"
              onPress={onMakeActive}
              accessibilityLabel={`Make ${vehicle.nickname} the active vehicle`}
              style={styles.action}
            />
          )}
          <Button
            label="Edit"
            variant="ghost"
            onPress={onEdit}
            accessibilityLabel={`Edit ${vehicle.nickname}`}
            style={styles.action}
          />
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  titles: { flex: 1, gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { flex: 1 },
});
