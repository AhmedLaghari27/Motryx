import React from 'react';
import { EmptyState, Screen } from '@/components';

export function CockpitScreen() {
  return (
    <Screen>
      <EmptyState
        icon="cockpit"
        title="No sensors on your cockpit yet"
        message="Connect an adapter, then add sensors from Live Data."
      />
    </Screen>
  );
}
