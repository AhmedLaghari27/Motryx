import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text } from '@/components';
import { openAppSettings } from '@/core/permissions/service';
import type { PermissionKind } from '@/core/permissions/types';
import { usePermission } from '@/core/permissions/usePermission';
import { spacing } from '@/theme/tokens';
import { actionLabel, statusLabel } from './copy';

const TITLES: Record<PermissionKind, string> = { bluetooth: 'Bluetooth', location: 'Location' };

function PermissionRow({ kind }: { kind: PermissionKind }) {
  const { status, request } = usePermission(kind);
  const action = actionLabel(kind, status);
  const tone = status === 'granted' || status === 'deferred' ? 'live' : status === 'checking' ? 'secondary' : 'warn';

  return (
    <Card>
      <View style={styles.row}>
        <Text variant="label">{TITLES[kind]}</Text>
        <Text variant="caption" tone={tone}>
          {statusLabel(status)}
        </Text>
      </View>
      {action ? (
        <Button
          label={action}
          variant="secondary"
          onPress={() => (status === 'blocked' ? void openAppSettings() : void request())}
        />
      ) : null}
    </Card>
  );
}

/** Settings view of each permission and its next action. Requests only happen on a tap. */
export function PermissionsSection() {
  return (
    <>
      <Text variant="title">Permissions</Text>
      <Text tone="secondary">Motryx asks only when a feature needs it. You can review them here.</Text>
      <PermissionRow kind="bluetooth" />
      <PermissionRow kind="location" />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
});
