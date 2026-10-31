import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { reconcileStatus } from './logic';
import { getPermissionStatus, requestPermission } from './service';
import type { PermissionKind, PermissionStatus } from './types';

/** Permission status for one kind. Re-checks when the app returns from system settings. */
export function usePermission(kind: PermissionKind) {
  const [status, setStatus] = useState<PermissionStatus | 'checking'>('checking');

  const refresh = useCallback(async () => {
    const next = await getPermissionStatus(kind);
    setStatus((prev) => reconcileStatus(prev, next));
  }, [kind]);

  useEffect(() => {
    let cancelled = false;
    void getPermissionStatus(kind).then((next) => {
      if (!cancelled) setStatus((prev) => reconcileStatus(prev, next));
    });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const request = useCallback(async () => {
    const next = await requestPermission(kind);
    setStatus(next);
    return next;
  }, [kind]);

  return { status, request, refresh };
}
