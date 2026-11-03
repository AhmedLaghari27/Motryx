// DEV ONLY: believable, moving values for the simulator. Never used for real readings.

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Raw data bytes a simulated car would answer for a Mode 01 PID, or null if it has none. */
export function simulatedBytes(pid: number, nowMs: number, elapsedSec: number): number[] | null {
  const wave = (periodMs: number) => Math.sin((nowMs / periodMs) * 2 * Math.PI);
  const percent = (v: number) => Math.round((clamp(v, 0, 100) * 255) / 100);
  const word = (raw: number) => {
    const r = clamp(Math.round(raw), 0, 65535);
    return [r >> 8, r & 0xff];
  };

  switch (pid) {
    case 0x04: return [percent(28 + 12 * wave(7000))]; // load %
    case 0x05: return [90 + 40]; // coolant 90 C
    case 0x06: return [Math.round(((1.5 * wave(4000) + 100) * 128) / 100)]; // short trim ~ +-1.5 %
    case 0x07: return [Math.round(((2.3 + 100) * 128) / 100)]; // long trim 2.3 %
    case 0x0c: return word((900 + 800 * (1 + wave(9000))) * 4); // RPM 900..2500
    case 0x0d: return [Math.round(clamp(45 + 35 * wave(15000), 0, 255))]; // speed km/h
    case 0x0e: return [Math.round((12 + 5 * wave(5000) + 64) * 2)]; // timing deg
    case 0x0f: return [32 + 40]; // intake air 32 C
    case 0x10: return word((5 + 3 * wave(9000)) * 100); // MAF g/s
    case 0x11: return [percent(18 + 12 * wave(6000))]; // throttle %
    case 0x1f: return word(elapsedSec); // run time s
    case 0x21: return [0, 0]; // distance with warning light on
    case 0x2f: return [percent(63)]; // fuel level %
    case 0x31: return word(1280); // distance since codes cleared
    case 0x33: return [101]; // barometric kPa
    case 0x42: return word(14100); // module voltage 14.1 V
    case 0x46: return [24 + 40]; // ambient 24 C
    case 0x5c: return [98 + 40]; // oil 98 C
    case 0x5e: return word(1.8 * 20); // fuel rate L/h
    default: return null;
  }
}
