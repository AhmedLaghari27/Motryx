import { decodeSensorBytes } from '@/core/obd/decoder/mode01';
import { MODE01_SENSORS } from '@/core/obd/pid-registry/registry';
import { simulatedBytes } from '@/dev/simulatedVehicle';

describe('simulated vehicle', () => {
  it('produces valid, in-range values for every sensor over time', () => {
    for (const sensor of MODE01_SENSORS) {
      for (let t = 0; t < 120_000; t += 2_500) {
        const bytes = simulatedBytes(sensor.pid, t, Math.floor(t / 1000));
        if (!bytes) continue;
        const r = decodeSensorBytes(sensor, bytes);
        expect(r).toMatchObject({ ok: true });
      }
    }
  });

  it('actually moves: RPM changes over time', () => {
    const values = new Set([0, 3000, 6000, 9000].map((t) => (simulatedBytes(0x0c, t, 0) ?? []).join(',')));
    expect(values.size).toBeGreaterThan(1);
  });

  it('has no data for PIDs it does not model', () => {
    expect(simulatedBytes(0x01, 0, 0)).toBeNull();
  });
});
