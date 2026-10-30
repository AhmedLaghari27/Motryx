import React from 'react';
import { EmptyState, Screen } from '@/components';

export function GarageScreen() {
  return (
    <Screen>
      <EmptyState
        icon="garage"
        title="No vehicles yet"
        message="Add a vehicle to keep its readings and sessions together."
      />
    </Screen>
  );
}
