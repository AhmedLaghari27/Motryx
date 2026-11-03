import type { ConnectionManager } from '../obd/adapter/ConnectionManager';
import type { ConnectionSnapshot } from '../obd/adapter/connectionMachine';
import { PollingScheduler } from '../obd/polling/PollingScheduler';
import { TelemetryStore } from './TelemetryStore';

/** The app-wide telemetry store and poller. */
export const telemetry = new TelemetryStore();
export const poller = new PollingScheduler({ telemetry });

let unsubscribe: (() => void) | null = null;

/**
 * Polling follows the connection. While connected, the poller runs. If the link drops, every live
 * value turns stale at once; after a deliberate disconnect the old values are discarded.
 */
export function bindTelemetry(manager: ConnectionManager): void {
  unsubscribe?.();
  poller.setClientProvider(() => manager.getClient());

  const apply = (snapshot: ConnectionSnapshot) => {
    if (snapshot.state === 'connected') {
      poller.start();
      return;
    }
    void poller.stop();
    if (snapshot.state === 'idle') telemetry.clear();
    else telemetry.markAllStale();
  };

  unsubscribe = manager.subscribe(apply);
  apply(manager.getSnapshot());
}

export function unbindTelemetry(): void {
  unsubscribe?.();
  unsubscribe = null;
  poller.setClientProvider(() => null);
  void poller.stop();
  telemetry.clear();
}
