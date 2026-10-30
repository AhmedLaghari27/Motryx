import { create } from 'zustand';
import type { ConnectionState } from '@/types/telemetry';

type ConnectionStore = {
  state: ConnectionState;
  setState: (state: ConnectionState) => void;
};

// Placeholder owner of connection state; the Adapter Connection step drives it for real.
export const useConnectionStore = create<ConnectionStore>((set) => ({
  state: 'idle',
  setState: (state) => set({ state }),
}));
