// DEV ONLY: one shared simulated adapter, so the connection survives leaving the simulator screen
// and the Live Data tab can show what discovery found.
import { ConnectionManager } from '@/core/obd/adapter/ConnectionManager';
import { SimulatedElm327Transport } from './SimulatedElm327Transport';

export type DevAdapter = { sim: SimulatedElm327Transport; manager: ConnectionManager };

let instance: DevAdapter | null = null;

export function getDevAdapter(): DevAdapter {
  if (!instance) {
    const sim = new SimulatedElm327Transport({ latencyMs: 250, connectDelayMs: 700, chunkSize: 8 });
    instance = { sim, manager: new ConnectionManager(sim, { backoffMs: [1000, 2000, 4000] }) };
  }
  return instance;
}
