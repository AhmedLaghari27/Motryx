import { create } from 'zustand';
import type { AdapterError } from '@/core/obd/adapter/errors';
import type { ConnectionManager } from '@/core/obd/adapter/ConnectionManager';
import type { VehicleCapabilities } from '@/core/obd/discovery/capabilities';
import { discoverSupportedPids, RANGE_BASES } from '@/core/obd/discovery/discover';
import { poller } from '@/core/telemetry/instances';

type Status = 'idle' | 'discovering' | 'ready' | 'error';

type DiscoveryStore = {
  status: Status;
  /** Ranges read so far, out of at most RANGE_BASES.length */
  progress: number;
  capabilities: VehicleCapabilities | null;
  warnings: string[];
  error: AdapterError | null;
  run: () => Promise<void>;
  /** Start discovering whenever the manager becomes connected; clear when it is not. */
  bind: (manager: ConnectionManager) => void;
  unbind: () => void;
};

export const MAX_RANGES = RANGE_BASES.length;

const EMPTY = { status: 'idle', progress: 0, capabilities: null, warnings: [], error: null } as const;

export const useDiscoveryStore = create<DiscoveryStore>((set, get) => {
  let manager: ConnectionManager | null = null;
  let unsubscribe: (() => void) | null = null;
  let generation = 0; // results from an older run are discarded

  const reset = () => {
    generation += 1;
    poller.setSupported([]); // nothing is polled until the car has said what it supports
    set({ ...EMPTY, warnings: [] });
  };

  const run = async () => {
    const client = manager?.getClient();
    if (!client) return;
    const mine = ++generation;
    set({ status: 'discovering', progress: 0, capabilities: null, warnings: [], error: null });

    const result = await discoverSupportedPids(client, {
      onProgress: (done) => {
        if (mine === generation) set({ progress: done });
      },
    });
    if (mine !== generation) return;

    if (result.ok) {
      poller.setSupported(result.capabilities.supportedPids);
      set({ status: 'ready', capabilities: result.capabilities, warnings: result.warnings });
    }
    else set({ status: 'error', error: { code: result.error } });
  };

  return {
    ...EMPTY,
    warnings: [],
    run,
    bind: (next) => {
      if (manager === next) return;
      unsubscribe?.();
      manager = next;
      unsubscribe = next.subscribe((snapshot) => {
        if (snapshot.state === 'connected') void run();
        else if (get().status !== 'idle') reset();
      });
      if (next.getSnapshot().state === 'connected') void run();
    },
    unbind: () => {
      unsubscribe?.();
      unsubscribe = null;
      manager = null;
      reset();
    },
  };
});
