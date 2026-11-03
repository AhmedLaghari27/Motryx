import { PollingScheduler } from '@/core/obd/polling/PollingScheduler';
import type { CommandResult } from '@/core/obd/adapter/responses';
import { TelemetryStore } from '@/core/telemetry/TelemetryStore';
import { wait } from '../helpers/connection';

const FAST = { fast: 10, normal: 20, slow: 40 };

/** A fake adapter that records what it was asked and answers from a table. */
function fakeClient(answers: Record<string, CommandResult | ((n: number) => CommandResult)> = {}) {
  const asked: string[] = [];
  const counts: Record<string, number> = {};
  return {
    asked,
    counts,
    client: {
      send: async (command: string): Promise<CommandResult> => {
        asked.push(command);
        counts[command] = (counts[command] ?? 0) + 1;
        const answer = answers[command];
        if (typeof answer === 'function') return answer(counts[command] ?? 0);
        return answer ?? { ok: false, error: 'NO_DATA', lines: [] };
      },
    },
  };
}

const ok = (...lines: string[]): CommandResult => ({ ok: true, lines });

function setup(answers: Record<string, CommandResult | ((n: number) => CommandResult)> = {}) {
  const telemetry = new TelemetryStore();
  const fake = fakeClient(answers);
  const scheduler = new PollingScheduler({ telemetry, getClient: () => fake.client, intervals: FAST, timeoutMs: 50 });
  return { telemetry, scheduler, ...fake };
}

describe('PollingScheduler', () => {
  it('polls only supported sensors that someone is looking at', async () => {
    const { scheduler, telemetry, asked } = setup({ '010C': ok('41 0C 1A F8') });
    scheduler.setSupported([0x0c, 0x05]);
    scheduler.setInterest('screen', [0x0c, 0x0b], 'foreground'); // 0B is not supported, 05 nobody watches
    scheduler.start();
    await wait(60);
    await scheduler.stop();

    expect(new Set(asked)).toEqual(new Set(['010C']));
    expect(telemetry.get('engine.rpm')).toMatchObject({ status: 'live', value: 1726 });
    expect(telemetry.get('pressure.map')).toBeUndefined();
  });

  it('does nothing when nothing is supported or nobody is watching', async () => {
    const { scheduler, asked } = setup();
    scheduler.setInterest('screen', [0x0c], 'foreground');
    scheduler.start();
    await wait(40);
    scheduler.setSupported([0x0c]);
    scheduler.clearInterest('screen');
    await wait(40);
    await scheduler.stop();
    expect(asked).toEqual([]);
  });

  it('asks fast sensors more often than slow ones, and foreground more than background', async () => {
    const { scheduler, counts } = setup({
      '010C': ok('41 0C 1A F8'),
      '0105': ok('41 05 7B'),
      '0111': ok('41 11 80'),
    });
    scheduler.setSupported([0x0c, 0x05, 0x11]);
    scheduler.setInterest('cockpit', [0x0c], 'foreground');
    scheduler.setInterest('list', [0x05, 0x11], 'background');
    scheduler.start();
    await wait(400);
    await scheduler.stop();

    expect(counts['010C']).toBeGreaterThan(counts['0105'] ?? 0); // fast beats slow
    expect(counts['010C']).toBeGreaterThan(counts['0111'] ?? 0); // foreground beats background
  });

  it('gives a failing sensor an error reading and backs off instead of hammering it', async () => {
    const { scheduler, telemetry, counts } = setup({ '010C': { ok: false, error: 'NO_DATA', lines: [] } });
    scheduler.setSupported([0x0c]);
    scheduler.setInterest('screen', [0x0c], 'foreground');
    scheduler.start();
    await wait(300);
    await scheduler.stop();

    expect(telemetry.get('engine.rpm')).toMatchObject({ status: 'error', value: null, error: { code: 'NO_DATA' } });
    // 10 ms base with exponential back-off: far fewer than the ~30 polls a fixed rate would make
    expect(counts['010C']).toBeLessThan(12);
  });

  it('recovers a sensor once it answers again', async () => {
    const { scheduler, telemetry } = setup({
      '010C': (n) => (n <= 2 ? { ok: false, error: 'NO_DATA', lines: [] } : ok('41 0C 1A F8')),
    });
    scheduler.setSupported([0x0c]);
    scheduler.setInterest('screen', [0x0c], 'foreground');
    scheduler.start();
    await wait(400);
    await scheduler.stop();
    expect(telemetry.get('engine.rpm')?.status).toBe('live');
  });

  it('does not blame the sensor when the link is down', async () => {
    const { scheduler, telemetry } = setup({ '010C': { ok: false, error: 'DISCONNECTED', lines: [] } });
    scheduler.setSupported([0x0c]);
    scheduler.setInterest('screen', [0x0c], 'foreground');
    scheduler.start();
    await wait(80);
    await scheduler.stop();
    expect(telemetry.get('engine.rpm')).toBeUndefined();
  });

  it('turns a value stale when it stops being refreshed', async () => {
    const telemetry = new TelemetryStore();
    let answering = true;
    const client = { send: async (): Promise<CommandResult> => (answering ? ok('41 0C 1A F8') : { ok: false, error: 'DISCONNECTED', lines: [] }) };
    let clock = 1_000_000;
    const scheduler = new PollingScheduler({ telemetry, getClient: () => client, intervals: FAST, now: () => clock });
    scheduler.setSupported([0x0c]);
    scheduler.setInterest('screen', [0x0c], 'foreground');
    scheduler.start();
    await wait(60);
    expect(telemetry.get('engine.rpm')?.status).toBe('live');

    answering = false;
    clock += 10_000; // ten seconds pass with no new reading
    await wait(700); // the sweep runs twice a second
    await scheduler.stop();
    expect(telemetry.get('engine.rpm')?.status).toBe('stale');
  });

  it('stops asking after stop(), and start() twice does not double the polling', async () => {
    const { scheduler, asked } = setup({ '010C': ok('41 0C 1A F8') });
    scheduler.setSupported([0x0c]);
    scheduler.setInterest('screen', [0x0c], 'foreground');
    scheduler.start();
    scheduler.start();
    await wait(50);
    await scheduler.stop();
    const after = asked.length;
    await wait(60);
    expect(asked.length).toBe(after);
  });

  it('allows more time before calling a slow sensor stale', () => {
    const { scheduler } = setup();
    scheduler.setSupported([0x05, 0x0c]);
    scheduler.setInterest('screen', [0x05, 0x0c], 'background');
    expect(scheduler.staleAfterFor('temp.coolant')).toBeGreaterThanOrEqual(scheduler.staleAfterFor('engine.rpm'));
    expect(scheduler.staleAfterFor('unknown.sensor')).toBeGreaterThanOrEqual(2000);
  });
});
