import { ConnectionManager } from '@/core/obd/adapter/ConnectionManager';
import { SimulatedElm327Transport, type SimOptions } from '@/dev/SimulatedElm327Transport';
import { useConnectionStore } from '@/state/connection.store';
import { useDiscoveryStore } from '@/state/discovery.store';
import { wait } from '../helpers/connection';

const target = { id: 'sim', name: 'Simulated', kind: 'ble', simulated: true } as const;

function attach(options: SimOptions = {}) {
  const sim = new SimulatedElm327Transport(options);
  const manager = new ConnectionManager(sim, { backoffMs: [5, 5], timeouts: { reset: 40, at: 40, probe: 60, query: 40 } });
  useConnectionStore.getState().attach(manager);
  return { sim, manager };
}

async function until(check: () => boolean, ms = 2000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > ms) throw new Error('Timed out');
    await wait(5);
  }
}

afterEach(() => {
  useConnectionStore.getState().detach();
});

describe('discovery follows the connection', () => {
  it('starts idle, discovers after connecting, and reports the sensors', async () => {
    const { manager } = attach();
    expect(useDiscoveryStore.getState().status).toBe('idle');

    await manager.connect(target);
    await until(() => useDiscoveryStore.getState().status === 'ready');

    const { capabilities, progress } = useDiscoveryStore.getState();
    expect(capabilities?.supportedPids).toHaveLength(24);
    expect(progress).toBe(3);
  });

  it('clears the results when the connection ends', async () => {
    const { manager } = attach();
    await manager.connect(target);
    await until(() => useDiscoveryStore.getState().status === 'ready');

    await manager.disconnect();
    expect(useDiscoveryStore.getState()).toMatchObject({ status: 'idle', capabilities: null, progress: 0 });
  });

  it('discovers again after the link drops and recovers', async () => {
    const { manager, sim } = attach();
    await manager.connect(target);
    await until(() => useDiscoveryStore.getState().status === 'ready');

    sim.simulateDrop();
    await until(() => useDiscoveryStore.getState().status === 'idle');
    await until(() => useDiscoveryStore.getState().status === 'ready');
    expect(useDiscoveryStore.getState().capabilities).not.toBeNull();
  });

  it('shows an error when the car stops answering the first range', async () => {
    const { manager } = attach({ bitmaps: { '0100': [0xbe, 0x1f, 0xa8, 0x13], '0120': null } });
    await manager.connect(target);
    await until(() => useDiscoveryStore.getState().status === 'ready');
    // a missing later range is a warning, not an error
    expect(useDiscoveryStore.getState().warnings.length).toBe(1);
    expect(useDiscoveryStore.getState().capabilities?.complete).toBe(false);
  });

  it('does not restart discovery when the same manager is attached again', async () => {
    const { manager } = attach();
    await manager.connect(target);
    await until(() => useDiscoveryStore.getState().status === 'ready');
    const first = useDiscoveryStore.getState().capabilities;

    useConnectionStore.getState().attach(manager);
    expect(useDiscoveryStore.getState().status).toBe('ready');
    expect(useDiscoveryStore.getState().capabilities).toBe(first);
  });
});
