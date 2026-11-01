import { Elm327Client } from '@/core/obd/adapter/Elm327Client';
import { compactHex } from '@/core/obd/adapter/responses';
import { SimulatedElm327Transport } from '@/dev/SimulatedElm327Transport';

async function connected(options = {}) {
  const sim = new SimulatedElm327Transport(options);
  await sim.connect({ id: 'sim', name: null, kind: 'ble' });
  const client = new Elm327Client(sim, { defaultTimeoutMs: 200, resyncTimeoutMs: 200 });
  return { sim, client };
}

describe('Elm327Client', () => {
  it('returns typed results', async () => {
    const { client } = await connected();
    const ok = await client.send('010C');
    expect(ok.ok && compactHex(ok.lines[0] ?? '')).toBe('410C1AF8');
    const noData = await client.send('0199');
    expect(noData).toMatchObject({ ok: false, error: 'NO_DATA' });
    const unknown = await client.send('ATXYZ');
    expect(unknown).toMatchObject({ ok: false, error: 'UNKNOWN_COMMAND' });
  });

  it('handles replies split into tiny chunks', async () => {
    const { client } = await connected({ chunkSize: 2 });
    const r = await client.send('010D');
    expect(r.ok && compactHex(r.lines[0] ?? '')).toBe('410D3C');
  });

  it('runs commands one at a time, in order, even when sent together', async () => {
    const { sim, client } = await connected({ latencyMs: 5 });
    const results = await Promise.all([client.send('010C'), client.send('0105'), client.send('010D')]);
    expect(results.map((r) => r.ok && compactHex(r.lines[0] ?? ''))).toEqual(['410C1AF8', '41057B', '410D3C']);
    expect(sim.overlaps).toBe(0);
    expect(sim.commands).toEqual(['010C', '0105', '010D']);
  });

  it('times out a silent adapter', async () => {
    const { client } = await connected({ scenario: 'silent' });
    expect(await client.send('010C', { timeoutMs: 30 })).toMatchObject({ ok: false, error: 'TIMEOUT' });
  });

  it('recovers after a timeout without mixing up the next answer', async () => {
    const { client } = await connected({ slowCommands: { '010C': 150 } });
    expect(await client.send('010C', { timeoutMs: 30 })).toMatchObject({ ok: false, error: 'TIMEOUT' });
    const next = await client.send('0105');
    expect(next.ok && compactHex(next.lines[0] ?? '')).toBe('41057B');
  });

  it('fails cleanly when the link drops mid-command', async () => {
    const { sim, client } = await connected({ latencyMs: 100 });
    const pending = client.send('010C');
    sim.simulateDrop();
    client.dispose();
    expect(await pending).toMatchObject({ ok: false, error: 'DISCONNECTED' });
  });

  it('refuses to send after dispose', async () => {
    const { client } = await connected();
    client.dispose();
    expect(await client.send('010C')).toMatchObject({ ok: false, error: 'DISCONNECTED' });
  });
});
