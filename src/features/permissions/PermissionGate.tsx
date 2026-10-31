import React, { type ReactNode } from 'react';
import { LoadingState } from '@/components';
import { isUsable } from '@/core/permissions/logic';
import { openAppSettings } from '@/core/permissions/service';
import type { PermissionKind } from '@/core/permissions/types';
import { usePermission } from '@/core/permissions/usePermission';
import { PermissionRationale } from './PermissionRationale';

type Props = { kind: PermissionKind; children: ReactNode; onNotNow?: () => void };

/**
 * Wrap any feature that needs a permission. Children render only once it is usable;
 * until then the person sees why it is needed, with one clear next action.
 */
export function PermissionGate({ kind, children, onNotNow }: Props) {
  const { status, request } = usePermission(kind);

  if (status === 'checking') return <LoadingState label="Checking permission" />;
  if (isUsable(status)) return <>{children}</>;

  return (
    <PermissionRationale
      kind={kind}
      status={status}
      onAllow={() => void request()}
      onOpenSettings={() => void openAppSettings()}
      onNotNow={onNotNow}
    />
  );
}
