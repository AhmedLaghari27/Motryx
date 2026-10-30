import React from 'react';
import { EmptyState, Screen } from '@/components';

export function DiagnosticsScreen() {
  return (
    <Screen>
      <EmptyState
        icon="diagnostics"
        title="Connect to read fault codes"
        message="Once connected, Motryx shows stored and pending codes your vehicle reports."
      />
    </Screen>
  );
}
