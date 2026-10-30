import React from 'react';
import { EmptyState, Screen } from '@/components';

export function LiveDataScreen() {
  return (
    <Screen>
      <EmptyState
        icon="live"
        title="No live data yet"
        message="Connect an adapter to see which sensors your vehicle supports."
      />
    </Screen>
  );
}
