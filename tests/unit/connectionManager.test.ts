import { ConnectionManager } from '@/core/obd/adapter/ConnectionManager';
import { SimulatedElm327Transport, type SimOptions } from '@/dev/SimulatedElm327Transport';
import { recordSnapshots, wait, waitForState } from '../helpers/connection';

const target = { id: 'sim', name: 'Simulated', kind: 'ble' } as const;
const fastTimeouts = { reset: 40, at: 40, probe: 60, query: 40 };

function setup(options: SimOptions = {}, backoffMs: number[] = [5, 5, 5]) {
  const sim = new SimulatedElm327Transport(options);
  const manager = new ConnectionManager(sim, { backoffMs, timeouts: fastTimeouts });
  return { sim, manager, rec: recordSnapshots(manager) };
}

describe('ConnectionManager', () => {
  it('connects a healthy adapter and exposes the command client', async () => {
    const { manager, rec } = setup();
    await manager.connect(target);
    expect(rec.states()).toEqual(['connecting', 'initializing', 'connected']);
    expect(manager.getSnapshot().info?.version).toBe('ELM327 v1.5');
    expect(manager.getClient()).not.toBeNull();
  });

  it('reports an adapter that cannot be found', async () => {
    const { manager, rec } = setup({ failConnect: 'NOT_FOUND' });
    await manager.connect(target);
    expect(rec.states()).toEqual(['connecting', 'error']);
    expect(manager.getSnapshot().error?.code).toBe('ADAPTER_NOT_FOUND');
    expect(manager.getClient()).toBeNull();
  });

  it('reports a denied permission', async () => {
    const { manager } = setup({ failConnect: 'PERMISSION_DENIED' });
    await manager.connect(target);
    expect(manager.getSnapshot().error?.code).toBe('PERMISSION_DENIED');
  });

  it('tells "car silent" apart from "adapter fine", and releases the link', async () => {
    const { manager, sim } = setup({ scenario: 'ignition-off' });
    await manager.connect(target);
    expect(manager.getSnapshot()).toMatchObject({ state: 'error', error: { code: 'VEHICLE_NOT_RESPONDING' } });
    expect(sim.isConnected).toBe(false);
  });

  it('reports a device that is not an adapter', async () => {
    const { manager } = setup({ scenario: 'silent' });
    await manager.connect(target);
    expect(manager.getSnapshot().error?.code).toBe('NOT_AN_ELM327');
  });

  it('ignores connect while already connected', async () => {
    const { manager, rec } = setup();
    await manager.connect(target);
    const count = rec.snapshots.length;
    await manager.connect(target);
    expect(rec.snapshots.length).toBe(count);
  });

  it('can be retried after a failure', async () => {
    const { manager, sim } = setup({ failConnect: 'TIMEOUT' });
    await manager.connect(target);
    expect(manager.getSnapshot().error?.code).toBe('CONNECT_TIMEOUT');
    sim.setUnplugged(false);
    sim.options.failConnect = null;
    await manager.connect(target);
    expect(manager.getSnapshot().state).toBe('connected');
  });

  it('lets the user disconnect', async () => {
    const { manager } = setup();
    await manager.connect(target);
    await manager.disconnect();
    expect(manager.getSnapshot().state).toBe('idle');
    expect(manager.getClient()).toBeNull();
  });

  it('recovers by itself after the link drops', async () => {
    const { manager, sim, rec } = setup({ failNextConnects: 0 });
    await manager.connect(target);
    sim.options.failNextConnects = 1; // first retry is refused, second works
    sim.simulateDrop();
    expect(manager.getSnapshot().state).toBe('reconnecting');
    await waitForState(manager, 'connected');
    expect(rec.states()).toContain('reconnecting');
    expect(rec.snapshots.some((s) => s.attempt === 2)).toBe(true);
    expect(manager.getSnapshot().attempt).toBe(0);
    expect(manager.getClient()).not.toBeNull();
  });

  it('gives up and says so when the adapter never comes back', async () => {
    const { manager, sim } = setup();
    await manager.connect(target);
    sim.setUnplugged(true);
    sim.simulateDrop();
    const final = await waitForState(manager, 'disconnected');
    expect(final.error?.code).toBe('DISCONNECTED');
    expect(manager.getClient()).toBeNull();
  });

  it('stops reconnecting as soon as the user disconnects', async () => {
    const { manager, sim, rec } = setup({}, [30, 30, 30]);
    await manager.connect(target);
    sim.simulateDrop();
    await manager.disconnect();
    await wait(120);
    expect(manager.getSnapshot().state).toBe('idle');
    expect(rec.states().filter((s) => s === 'connected')).toHaveLength(1);
  });

  it('abandons a connect that the user cancelled', async () => {
    const { manager, sim } = setup({ connectDelayMs: 40 });
    const connecting = manager.connect(target);
    await manager.disconnect();
    await connecting;
    await wait(80);
    expect(manager.getSnapshot().state).toBe('idle');
    expect(sim.isConnected).toBe(false);
  });
});
