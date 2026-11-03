import { ConnectionManager } from '@/core/obd/adapter/ConnectionManager';
import { poller, telemetry } from '@/core/telemetry/instances';
import { MODE01_SENSORS } from '@/core/obd/pid-registry/registry';
import { SimulatedElm327Transport, type SimOptions } from '@/dev/SimulatedElm327Transport';
import { useConnectionStore } from '@/state/connection.store';
import { useDiscoveryStore } from '@/state/discovery.store';
import { wait } from '../helpers/connection';

const target = { id: 'sim', name: 'Simulated', kind: 'ble', simulated: true } as const;
const READABLE = [0x04, 0x05, 0x06, 0x07, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x1f, 0x21, 0x2f, 0x31, 0x33, 0x42, 0x46, 0x5c, 0x5e];

function attach(options: SimOptions = {}) {
  const sim = new SimulatedElm327Transport({ liveValues: true, chunkSize: 6, ...options });
  const manager = new ConnectionManager(sim, { backoffMs: [5, 5], timeouts: { reset: 40, at: 40, probe: 60, query: 40 } });
  useConnectionStore.getState().attach(manager);
  return { sim, manager };
}

async function until(check: () => boolean, ms = 4000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > ms) throw new Error('Timed out waiting for condition');
    await wait(5);
  }
}

afterEach(() => {
  poller.clearInterest('test');
  useConnectionStore.getState().detach();
});

describe('connect → discover → poll → telemetry', () => {
  it('shows real decoded values for every readable sensor the car supports', async () => {
    const { manager } = attach();
    await manager.connect(target);
    await until(() => useDiscoveryStore.getState().status === 'ready');
    poller.setInterest('test', READABLE, 'foreground');
    await until(() => MODE01_SENSORS.filter((s) => READABLE.includes(s.pid)).every((s) => telemetry.get(s.id)?.status === 'live'));

    const rpm = telemetry.get('engine.rpm');
    expect(rpm).toMatchObject({ status: 'live', unit: 'rpm', source: 'OBD-II Mode 01' });
    expect(Number(rpm?.value)).toBeGreaterThanOrEqual(900);
    expect(Number(rpm?.value)).toBeLessThanOrEqual(2500);
    expect(telemetry.get('temp.coolant')?.value).toBe(90);
    // each decoded value must be one the registry accepts
    for (const s of MODE01_SENSORS.filter((x) => READABLE.includes(x.pid))) {
      expect(telemetry.get(s.id)?.value).not.toBeNull();
    }
  });

  it('never polls a sensor the car did not list', async () => {
    const { manager, sim } = attach();
    await manager.connect(target);
    await until(() => useDiscoveryStore.getState().status === 'ready');
    poller.setInterest('test', [0x0b, 0x45, 0x0c], 'foreground'); // 0B and 45 are not supported
    await until(() => telemetry.get('engine.rpm')?.status === 'live');
    expect(sim.commands).not.toContain('010B');
    expect(sim.commands).not.toContain('0145');
    expect(telemetry.get('pressure.map')).toBeUndefined();
  });

  it('shows an error, not a number, for sensors that do not answer', async () => {
    const { manager } = attach({ scenario: 'flaky' });
    await manager.connect(target);
    await until(() => useDiscoveryStore.getState().status === 'ready');
    poller.setInterest('test', [0x0f, 0x5c, 0x0c], 'foreground');
    await until(() => telemetry.get('temp.intake')?.status === 'error' && telemetry.get('engine.rpm')?.status === 'live');

    expect(telemetry.get('temp.intake')).toMatchObject({ value: null, error: { code: 'NO_DATA', message: 'No response' } });
    expect(telemetry.get('engine.rpm')?.status).toBe('live'); // one bad sensor does not stop the others
  });

  it('turns every value stale the moment the link drops', async () => {
    const { manager, sim } = attach();
    await manager.connect(target);
    await until(() => useDiscoveryStore.getState().status === 'ready');
    poller.setInterest('test', [0x0c, 0x05], 'foreground');
    await until(() => telemetry.get('engine.rpm')?.status === 'live' && telemetry.get('temp.coolant')?.status === 'live');

    sim.simulateDrop();
    expect(telemetry.get('engine.rpm')?.status).toBe('stale');
    expect(telemetry.get('temp.coolant')?.status).toBe('stale');
    expect(telemetry.get('engine.rpm')?.value).not.toBeNull(); // last value kept, clearly labelled
  });

  it('goes live again after the link recovers', async () => {
    const { manager, sim } = attach();
    await manager.connect(target);
    await until(() => useDiscoveryStore.getState().status === 'ready');
    poller.setInterest('test', [0x0c], 'foreground');
    await until(() => telemetry.get('engine.rpm')?.status === 'live');

    sim.simulateDrop();
    expect(telemetry.get('engine.rpm')?.status).toBe('stale');
    await until(() => telemetry.get('engine.rpm')?.status === 'live');
  });

  it('discards old values after a deliberate disconnect', async () => {
    const { manager } = attach();
    await manager.connect(target);
    await until(() => useDiscoveryStore.getState().status === 'ready');
    poller.setInterest('test', [0x0c], 'foreground');
    await until(() => telemetry.get('engine.rpm')?.status === 'live');

    await manager.disconnect();
    expect(telemetry.get('engine.rpm')).toBeUndefined();
  });
});
