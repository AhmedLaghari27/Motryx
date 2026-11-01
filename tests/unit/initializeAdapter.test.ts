import { Elm327Client } from '@/core/obd/adapter/Elm327Client';
import { initializeAdapter, parseProtocolNumber, protocolName } from '@/core/obd/adapter/initialize';
import { SimulatedElm327Transport, type SimOptions } from '@/dev/SimulatedElm327Transport';

const fast = { reset: 40, at: 40, probe: 60, query: 40 };

async function run(options: SimOptions) {
  const sim = new SimulatedElm327Transport(options);
  await sim.connect({ id: 'sim', name: null, kind: 'ble' });
  const client = new Elm327Client(sim, { resyncTimeoutMs: 40 });
  return { sim, result: await initializeAdapter(client, fast) };
}

describe('initializeAdapter', () => {
  it('sets up a healthy car and reports the adapter and protocol', async () => {
    const { result, sim } = await run({ scenario: 'healthy' });
    expect(result).toEqual({
      ok: true,
      info: { version: 'ELM327 v1.5', protocolNumber: '6', protocolName: 'ISO 15765-4 CAN (11 bit, 500 kbaud)' },
    });
    expect(sim.commands).toEqual(['ATZ', 'ATE0', 'ATL0', 'ATS0', 'ATH0', 'ATSP0', '0100', 'ATDPN']);
  });

  it('works over a link that splits replies into tiny chunks', async () => {
    expect((await run({ chunkSize: 3 })).result.ok).toBe(true);
  });

  it('says the car is silent when the adapter is fine but the ignition is off', async () => {
    expect((await run({ scenario: 'ignition-off' })).result).toEqual({ ok: false, error: 'VEHICLE_NOT_RESPONDING' });
  });

  it('says the device is not an adapter when nothing answers, after a second try', async () => {
    const { result, sim } = await run({ scenario: 'silent' });
    expect(result).toEqual({ ok: false, error: 'NOT_AN_ELM327' });
    expect(sim.commands.filter((c) => c === 'ATZ')).toHaveLength(2);
  });
});

describe('protocol helpers', () => {
  it('names the standard protocols', () => {
    expect(protocolName('6')).toMatch(/CAN \(11 bit, 500/);
    expect(protocolName('a')).toMatch(/J1939/);
    expect(protocolName('Z')).toBeNull();
  });
  it('reads the ATDPN reply, with or without the automatic prefix', () => {
    expect(parseProtocolNumber('A6')).toBe('6');
    expect(parseProtocolNumber('6')).toBe('6');
    expect(parseProtocolNumber('AA')).toBe('A');
    expect(parseProtocolNumber('?')).toBeNull();
    expect(parseProtocolNumber(undefined)).toBeNull();
  });
});
