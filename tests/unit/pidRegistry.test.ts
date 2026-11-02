import { decodeMode01, decodeSensorBytes, hex2, parseMode01Response } from '@/core/obd/decoder/mode01';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  MODE01_SENSORS,
  getSensorByPid,
  type SensorDef,
} from '@/core/obd/pid-registry/registry';

const sensor = (pid: number): SensorDef => {
  const s = getSensorByPid(pid);
  if (!s) throw new Error(`No sensor for PID ${pid}`);
  return s;
};
const value = (pid: number, bytes: number[]) => {
  const r = decodeSensorBytes(sensor(pid), bytes);
  if (!r.ok) throw new Error(`Decode failed: ${r.error}`);
  return r.value;
};

describe('registry integrity', () => {
  it('has unique ids and PIDs, and valid definitions', () => {
    expect(new Set(MODE01_SENSORS.map((s) => s.id)).size).toBe(MODE01_SENSORS.length);
    expect(new Set(MODE01_SENSORS.map((s) => s.pid)).size).toBe(MODE01_SENSORS.length);
    for (const s of MODE01_SENSORS) {
      expect(CATEGORY_ORDER).toContain(s.category);
      expect(s.min).toBeLessThan(s.max);
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.pid % 0x20).not.toBe(0); // range-announcing PIDs are not sensors
    }
  });

  it('labels every category', () => {
    for (const c of CATEGORY_ORDER) expect(CATEGORY_LABELS[c].length).toBeGreaterThan(0);
  });

  // The SAE spec limits oil temperature to 210 C, narrower than the byte range (255 - 40 = 215).
  const NARROWER_THAN_BYTE_RANGE = new Set(['temp.oil']);

  it('decodes every sensor at both ends of the byte range, except where the spec range is narrower', () => {
    for (const s of MODE01_SENSORS) {
      const low = Array<number>(s.bytes).fill(0);
      const high = Array<number>(s.bytes).fill(255);
      expect(decodeSensorBytes(s, low).ok).toBe(true);
      if (!NARROWER_THAN_BYTE_RANGE.has(s.id)) expect(decodeSensorBytes(s, high).ok).toBe(true);
    }
  });

  it('rejects an oil temperature above the spec limit instead of showing 215 degrees', () => {
    const oil = getSensorByPid(0x5c);
    if (!oil) throw new Error('missing oil sensor');
    expect(decodeSensorBytes(oil, [0xfa])).toEqual({ ok: true, value: 210 });
    expect(decodeSensorBytes(oil, [0xff])).toEqual({ ok: false, error: 'OUT_OF_RANGE' });
  });
});

describe('formulas (SAE J1979 known values)', () => {
  it.each([
    // [pid, raw bytes, expected]
    [0x0c, [0x1a, 0xf8], 1726], // RPM = (256A + B) / 4
    [0x0c, [0x00, 0x00], 0],
    [0x0c, [0xff, 0xff], 16383.75],
    [0x05, [0x7b], 83], // coolant = A - 40
    [0x05, [0x00], -40],
    [0x05, [0xff], 215],
    [0x0f, [0x3c], 20],
    [0x46, [0x41], 25],
    [0x5c, [0x82], 90],
    [0x0d, [0x3c], 60],
    [0x04, [0xff], 100], // load = A * 100 / 255
    [0x04, [0x00], 0],
    [0x11, [0xff], 100],
    [0x0a, [0x64], 300], // fuel pressure = 3A
    [0x0b, [0x65], 101],
    [0x33, [0x65], 101],
    [0x0e, [0x80], 0], // timing = A/2 - 64
    [0x0e, [0x00], -64],
    [0x0e, [0xff], 63.5],
    [0x10, [0x01, 0x00], 2.56], // MAF = (256A + B) / 100
    [0x1f, [0x01, 0x2c], 300],
    [0x42, [0x36, 0xb0], 14], // module voltage = (256A + B) / 1000
    [0x5e, [0x00, 0xc8], 10], // fuel rate = (256A + B) / 20
    [0x21, [0x00, 0x0a], 10],
    [0x31, [0x27, 0x10], 10000],
    [0x06, [0x80], 0], // fuel trim = A * 100 / 128 - 100
    [0x07, [0x00], -100],
    [0x06, [0xff], 99.21875],
  ])('PID %s with %p gives %p', (pid, bytes, expected) => {
    expect(value(pid, bytes)).toBeCloseTo(expected, 4);
  });

  it('rounds nothing: 50.196% load stays precise until display', () => {
    expect(value(0x04, [0x80])).toBeCloseTo(50.196, 3);
  });
});

describe('decodeSensorBytes safety', () => {
  it('rejects the wrong number of bytes and bad bytes', () => {
    const rpm = sensor(0x0c);
    expect(decodeSensorBytes(rpm, [0x1a])).toEqual({ ok: false, error: 'MALFORMED' });
    expect(decodeSensorBytes(rpm, [0x1a, 0xf8, 0x00])).toEqual({ ok: false, error: 'MALFORMED' });
    expect(decodeSensorBytes(rpm, [0x1a, 256])).toEqual({ ok: false, error: 'MALFORMED' });
    expect(decodeSensorBytes(rpm, [0x1a, -1])).toEqual({ ok: false, error: 'MALFORMED' });
    expect(decodeSensorBytes(rpm, [0x1a, 1.5])).toEqual({ ok: false, error: 'MALFORMED' });
  });

  it('refuses a decoded value outside the sensor range instead of showing it', () => {
    const tampered: SensorDef = { ...sensor(0x05), max: 100 };
    expect(decodeSensorBytes(tampered, [0xff])).toEqual({ ok: false, error: 'OUT_OF_RANGE' });
  });
});

describe('parseMode01Response / decodeMode01', () => {
  it('pulls the data bytes out of a reply with or without spaces', () => {
    expect(parseMode01Response(['41 0C 1A F8'], 0x0c, 2)).toEqual([0x1a, 0xf8]);
    expect(parseMode01Response(['410C1AF8'], 0x0c, 2)).toEqual([0x1a, 0xf8]);
  });

  it('ignores other PIDs and picks the matching line among several', () => {
    expect(parseMode01Response(['41 0D 3C', '41 0C 1A F8'], 0x0c, 2)).toEqual([0x1a, 0xf8]);
    expect(parseMode01Response(['41 0D 3C'], 0x0c, 2)).toBeNull();
  });

  it('refuses short or garbled replies', () => {
    expect(parseMode01Response(['41 0C 1A'], 0x0c, 2)).toBeNull();
    expect(parseMode01Response(['41 0C'], 0x0c, 2)).toBeNull();
    expect(parseMode01Response(['41 0C 1G F8'], 0x0c, 2)).toBeNull();
    expect(parseMode01Response(['NO DATA'], 0x0c, 2)).toBeNull();
  });

  it('ignores padding bytes after the data', () => {
    expect(parseMode01Response(['41 05 7B 00 00'], 0x05, 1)).toEqual([0x7b]);
  });

  it('decodes a full reply, and never turns a bad reply into a number', () => {
    expect(decodeMode01(sensor(0x0c), ['41 0C 1A F8'])).toEqual({ ok: true, value: 1726 });
    expect(decodeMode01(sensor(0x0c), ['NO DATA'])).toEqual({ ok: false, error: 'MALFORMED' });
  });

  it('formats hex with two digits', () => {
    expect(hex2(5)).toBe('05');
    expect(hex2(0xc0)).toBe('C0');
  });
});
