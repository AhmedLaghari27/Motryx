import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ConnectionManager } from '@/core/obd/adapter/ConnectionManager';
import { describeAdapterError } from '@/core/obd/adapter/errors';
import { Button, Card, ConnectionBadge, Screen, Text } from '@/components';
import { useConnectionStore } from '@/state/connection.store';
import { spacing } from '@/theme/tokens';
import { SimulatedElm327Transport, type SimScenario } from './SimulatedElm327Transport';

const SCENARIOS: { id: SimScenario; label: string }[] = [
  { id: 'healthy', label: 'Healthy car' },
  { id: 'ignition-off', label: 'Ignition off' },
  { id: 'silent', label: 'Not an adapter' },
];

const TARGET = { id: 'simulated', name: 'Simulated ELM327', kind: 'ble' } as const;

/** Developer-only. Exercises the real connection code against a fake adapter, so no hardware is needed. */
export default function AdapterSimulatorScreen() {
  const [sim] = useState(() => new SimulatedElm327Transport({ latencyMs: 250, connectDelayMs: 700, chunkSize: 8 }));
  const [manager] = useState(() => new ConnectionManager(sim, { backoffMs: [1000, 2000, 4000] }));
  const [scenario, setScenario] = useState<SimScenario>('healthy');
  const [log, setLog] = useState<string[]>([]);

  const state = useConnectionStore((s) => s.state);
  const error = useConnectionStore((s) => s.error);
  const info = useConnectionStore((s) => s.info);
  const attempt = useConnectionStore((s) => s.attempt);

  useEffect(() => {
    const store = useConnectionStore.getState();
    store.attach(manager);
    const stopLog = manager.subscribe((snap) => {
      const extra = snap.attempt > 0 ? ` (attempt ${snap.attempt})` : snap.error ? ` (${snap.error.code})` : '';
      setLog((prev) => [`${snap.state}${extra}`, ...prev].slice(0, 12));
    });
    return () => {
      stopLog();
      void manager.disconnect();
      useConnectionStore.getState().detach();
    };
  }, [manager]);

  const busy = state === 'connecting' || state === 'initializing' || state === 'reconnecting';
  const copy = error ? describeAdapterError(error.code) : null;

  const chooseScenario = (next: SimScenario) => {
    setScenario(next);
    sim.setScenario(next);
  };

  return (
    <Screen scroll>
      <Text tone="secondary">
        A fake adapter for trying the real connection code. Nothing here is real car data.
      </Text>
      <ConnectionBadge />

      <Text variant="title">Scenario</Text>
      <View style={styles.row}>
        {SCENARIOS.map((s) => (
          <Button
            key={s.id}
            label={s.label}
            variant={scenario === s.id ? 'primary' : 'secondary'}
            onPress={() => chooseScenario(s.id)}
            style={styles.flex}
          />
        ))}
      </View>

      <Card>
        <Text variant="label" tone="secondary">
          State
        </Text>
        <Text variant="value">{state}{attempt > 0 ? ` · attempt ${attempt}` : ''}</Text>
        {info ? (
          <Text tone="secondary">
            {info.version ?? 'Unknown adapter'} · {info.protocolName ?? 'Protocol unknown'}
          </Text>
        ) : null}
        {copy ? (
          <>
            <Text tone="error">{copy.title}</Text>
            <Text tone="secondary">{copy.message}</Text>
          </>
        ) : null}
      </Card>

      <Button label="Connect" disabled={busy || state === 'connected'} onPress={() => void manager.connect(TARGET)} />
      <Button label="Disconnect" variant="secondary" onPress={() => void manager.disconnect()} />
      <Button label="Drop the link" variant="secondary" disabled={state !== 'connected'} onPress={() => sim.simulateDrop()} />
      <Button
        label="Unplug the adapter"
        variant="destructive"
        disabled={state !== 'connected'}
        onPress={() => {
          sim.setUnplugged(true);
          sim.simulateDrop('Adapter unplugged');
        }}
      />

      <Text variant="title">Log</Text>
      <Card>
        {log.length === 0 ? <Text tone="secondary">No activity yet.</Text> : log.map((line, i) => <Text key={`${i}-${line}`} variant="caption">{line}</Text>)}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
