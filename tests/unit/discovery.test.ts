import { Elm327Client } from '@/core/obd/adapter/Elm327Client';
import { RANGE_BASES, discoverSupportedPids } from '@/core/obd/discovery/discover';
import { groupSupportedSensors } from '@/core/obd/discovery/groupSensors';
import { SimulatedElm327Transport, type SimOptions } from '@/dev/SimulatedElm327Transport';

async function discover(options: SimOptions = {}, onProgress?: (n: number) => void) {
  const sim = new SimulatedElm327Transport({ chunkSize: 4, ...options });
  await sim.connect({ id: 'sim', name: null, kind: 'ble' });
  const client = new Elm327Client(sim, { resyncTimeoutMs: 40 });
  // set up like a real connection would
  for (const c of ['ATZ', 'ATE0', 'ATL0', 'ATS0', 'ATH0']) await client.send(c, { timeoutMs: 200 });
  const result = await discoverSupportedPids(client, { timeoutMs: 100, now: 42, onProgress });
  return { sim, result };
}

describe('discoverSupportedPids', () => {
  it('follows the chain of ranges and lists exactly what the car reports', async () => {
    const progress: number[] = [];
    const { result, sim } = await discover({}, (n) => progress.push(n));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.capabilities.supportedPids).toEqual([
      0x01, 0x03, 0x04, 0x05, 0x06, 0x07, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x13, 0x15, 0x1c, 0x1f,
      0x21, 0x2f, 0x31, 0x33,
      0x42, 0x46, 0x5c, 0x5e,
    ]);
    expect(result.capabilities).toMatchObject({ discoveredAt: 42, highestRangeBase: 0x40, complete: true });
    expect(result.warnings).toEqual([]);
    expect(progress).toEqual([1, 2, 3]);
    // it stopped when the last bit was clear, instead of asking every range
    expect(sim.commands.filter((c) => /^01[0-9A-F]{2}$/.test(c) && parseInt(c.slice(2), 16) % 0x20 === 0)).toEqual(['0100', '0120', '0140']);
  });

  it('does not list the range-announcing PIDs as sensors', async () => {
    const { result } = await discover();
    if (!result.ok) throw new Error('expected ok');
    for (const pid of [0x20, 0x40, 0x60]) expect(result.capabilities.supportedPids).not.toContain(pid);
  });

  it('stops after the first range when the car says there are no more', async () => {
    const { result } = await discover({ bitmaps: { '0100': [0x18, 0x18, 0x00, 0x00] } });
    if (!result.ok) throw new Error('expected ok');
    expect(result.capabilities.supportedPids).toEqual([0x04, 0x05, 0x0c, 0x0d]);
    expect(result.capabilities.highestRangeBase).toBe(0x00);
  });

  it('keeps what it learned and warns when a later range goes unanswered', async () => {
    const { result } = await discover({ bitmaps: { '0120': null } });
    if (!result.ok) throw new Error('expected ok');
    expect(result.capabilities.complete).toBe(false);
    expect(result.capabilities.highestRangeBase).toBe(0x00);
    expect(result.capabilities.supportedPids).toContain(0x0c);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/some may be missing/);
  });

  it('fails when the very first range cannot be read', async () => {
    const { result } = await discover({ bitmaps: { '0100': null } });
    expect(result).toEqual({ ok: false, error: 'VEHICLE_NOT_RESPONDING' });
  });

  it('never loops forever if every range claims there is another', async () => {
    const all = [0xff, 0xff, 0xff, 0xff];
    const bitmaps = Object.fromEntries(RANGE_BASES.map((b) => [`01${b.toString(16).toUpperCase().padStart(2, '0')}`, all]));
    const { result, sim } = await discover({ bitmaps });
    if (!result.ok) throw new Error('expected ok');
    expect(result.capabilities.highestRangeBase).toBe(0xc0);
    expect(sim.commands.filter((c) => /^01[0-9A-F]{2}$/.test(c)).length).toBe(RANGE_BASES.length);
  });
});

describe('groupSupportedSensors', () => {
  it('splits supported sensors into readable categories and what Motryx cannot read yet', async () => {
    const { result } = await discover();
    if (!result.ok) throw new Error('expected ok');
    const grouped = groupSupportedSensors(result.capabilities);

    expect(grouped.readableCount).toBe(19);
    expect(grouped.unreadablePids).toEqual([0x01, 0x03, 0x13, 0x15, 0x1c]);
    expect(grouped.sections.map((s) => s.title)).toEqual([
      'Engine & RPM',
      'Temperatures',
      'Pressure & boost',
      'Air intake & throttle',
      'Fuel system',
      'Ignition & combustion',
      'Electrical',
      'Vehicle & ECU information',
    ]);
  });

  it('shows only what is supported, never the whole registry', () => {
    const grouped = groupSupportedSensors({ discoveredAt: 1, supportedPids: [0x0c], highestRangeBase: 0, complete: true });
    expect(grouped.sections).toHaveLength(1);
    expect(grouped.sections[0]?.data.map((s) => s.id)).toEqual(['engine.rpm']);
  });

  it('handles a car that reports nothing readable', () => {
    const grouped = groupSupportedSensors({ discoveredAt: 1, supportedPids: [], highestRangeBase: 0, complete: true });
    expect(grouped).toEqual({ sections: [], readableCount: 0, unreadablePids: [] });
  });
});
