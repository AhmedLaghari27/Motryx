import { create } from 'zustand';
import type { ConnectionManager } from '@/core/obd/adapter/ConnectionManager';
import { INITIAL_SNAPSHOT, type ConnectionSnapshot } from '@/core/obd/adapter/connectionMachine';

type ConnectionStore = ConnectionSnapshot & {
  /** Mirror a manager's snapshots into the UI. Only one manager is attached at a time. */
  attach: (manager: ConnectionManager) => void;
  detach: () => void;
};

let unsubscribe: (() => void) | null = null;

export const useConnectionStore = create<ConnectionStore>((set) => ({
  ...INITIAL_SNAPSHOT,
  attach: (manager) => {
    unsubscribe?.();
    set(manager.getSnapshot());
    unsubscribe = manager.subscribe((snapshot) => set(snapshot));
  },
  detach: () => {
    unsubscribe?.();
    unsubscribe = null;
    set(INITIAL_SNAPSHOT);
  },
}));
