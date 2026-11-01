import type { ConnectionManager } from '@/core/obd/adapter/ConnectionManager';
import type { ConnectionSnapshot } from '@/core/obd/adapter/connectionMachine';

/** Records every snapshot a manager publishes. */
export function recordSnapshots(manager: ConnectionManager) {
  const snapshots: ConnectionSnapshot[] = [];
  manager.subscribe((s) => snapshots.push(s));
  return {
    snapshots,
    states: () => snapshots.map((s) => s.state),
  };
}

export function waitForState(manager: ConnectionManager, state: string, timeoutMs = 2000): Promise<ConnectionSnapshot> {
  return new Promise((resolve, reject) => {
    if (manager.getSnapshot().state === state) return resolve(manager.getSnapshot());
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Timed out waiting for "${state}", still "${manager.getSnapshot().state}"`));
    }, timeoutMs);
    const unsubscribe = manager.subscribe((s) => {
      if (s.state === state) {
        clearTimeout(timer);
        unsubscribe();
        resolve(s);
      }
    });
  });
}

export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
