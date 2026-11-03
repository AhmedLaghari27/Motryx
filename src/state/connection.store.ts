import { create } from 'zustand';
import type { ConnectionManager } from '@/core/obd/adapter/ConnectionManager';
import { INITIAL_SNAPSHOT, type ConnectionSnapshot } from '@/core/obd/adapter/connectionMachine';
import { bindTelemetry, unbindTelemetry } from '@/core/telemetry/instances';
import { useDiscoveryStore } from './discovery.store';

type ConnectionStore = ConnectionSnapshot & {
  /** Mirror a manager's snapshots into the UI. Only one manager is attached at a time. */
  attach: (manager: ConnectionManager) => void;
  detach: () => void;
};

let unsubscribe: (() => void) | null = null;
let attached: ConnectionManager | null = null;

export const useConnectionStore = create<ConnectionStore>((set) => ({
  ...INITIAL_SNAPSHOT,
  attach: (manager) => {
    if (attached === manager) return; // already mirrored; do not restart discovery
    unsubscribe?.();
    attached = manager;
    set(manager.getSnapshot());
    unsubscribe = manager.subscribe((snapshot) => set(snapshot));
    useDiscoveryStore.getState().bind(manager); // sensor discovery follows the connection
    bindTelemetry(manager); // so does polling
  },
  detach: () => {
    unsubscribe?.();
    unsubscribe = null;
    attached = null;
    useDiscoveryStore.getState().unbind();
    unbindTelemetry();
    set(INITIAL_SNAPSHOT);
  },
}));
