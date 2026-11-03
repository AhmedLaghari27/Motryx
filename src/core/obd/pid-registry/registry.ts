export type SensorCategory =
  | 'engine'
  | 'temperature'
  | 'pressure'
  | 'air-throttle'
  | 'fuel'
  | 'ignition'
  | 'electrical'
  | 'vehicle-info';

export const CATEGORY_ORDER: readonly SensorCategory[] = [
  'engine',
  'temperature',
  'pressure',
  'air-throttle',
  'fuel',
  'ignition',
  'electrical',
  'vehicle-info',
];

export const CATEGORY_LABELS: Record<SensorCategory, string> = {
  engine: 'Engine & RPM',
  temperature: 'Temperatures',
  pressure: 'Pressure & boost',
  'air-throttle': 'Air intake & throttle',
  fuel: 'Fuel system',
  ignition: 'Ignition & combustion',
  electrical: 'Electrical',
  'vehicle-info': 'Vehicle & ECU information',
};

export type SensorDef = {
  /** Stable canonical id, never reused */
  id: string;
  /** Mode 01 parameter id */
  pid: number;
  label: string;
  category: SensorCategory;
  /** Canonical unit: metric. Converted only for display. */
  unit: string;
  /** Data bytes in the reply (after "41 xx") */
  bytes: 1 | 2;
  /** A and B are the first and second data bytes, as in the SAE J1979 formulas */
  decode: (a: number, b: number) => number;
  /** Plausible limits; a decoded value outside them is an error, not a reading */
  min: number;
  max: number;
  decimals: number;
  source: string;
};

const SOURCE = 'OBD-II Mode 01';
const percent = (a: number) => (a * 100) / 255;
const trim = (a: number) => (a * 100) / 128 - 100;
const word = (a: number, b: number) => a * 256 + b;

/**
 * Standard SAE J1979 Mode 01 sensors. Manufacturer-specific data does NOT belong here:
 * it needs verified per-vehicle profiles. Verify formulas against the spec before adding any.
 */
export const MODE01_SENSORS: readonly SensorDef[] = [
  // Engine & RPM
  { id: 'engine.load', pid: 0x04, label: 'Calculated engine load', category: 'engine', unit: '%', bytes: 1, decode: (a) => percent(a), min: 0, max: 100, decimals: 1, source: SOURCE },
  { id: 'engine.rpm', pid: 0x0c, label: 'Engine RPM', category: 'engine', unit: 'rpm', bytes: 2, decode: (a, b) => word(a, b) / 4, min: 0, max: 16383.75, decimals: 0, source: SOURCE },
  { id: 'vehicle.speed', pid: 0x0d, label: 'Vehicle speed', category: 'engine', unit: 'km/h', bytes: 1, decode: (a) => a, min: 0, max: 255, decimals: 0, source: SOURCE },

  // Temperatures
  { id: 'temp.coolant', pid: 0x05, label: 'Coolant temperature', category: 'temperature', unit: '°C', bytes: 1, decode: (a) => a - 40, min: -40, max: 215, decimals: 0, source: SOURCE },
  { id: 'temp.intake', pid: 0x0f, label: 'Intake air temperature', category: 'temperature', unit: '°C', bytes: 1, decode: (a) => a - 40, min: -40, max: 215, decimals: 0, source: SOURCE },
  { id: 'temp.ambient', pid: 0x46, label: 'Ambient air temperature', category: 'temperature', unit: '°C', bytes: 1, decode: (a) => a - 40, min: -40, max: 215, decimals: 0, source: SOURCE },
  { id: 'temp.oil', pid: 0x5c, label: 'Engine oil temperature', category: 'temperature', unit: '°C', bytes: 1, decode: (a) => a - 40, min: -40, max: 210, decimals: 0, source: SOURCE },

  // Pressure & boost
  { id: 'pressure.fuel', pid: 0x0a, label: 'Fuel pressure (gauge)', category: 'pressure', unit: 'kPa', bytes: 1, decode: (a) => a * 3, min: 0, max: 765, decimals: 0, source: SOURCE },
  { id: 'pressure.map', pid: 0x0b, label: 'Intake manifold pressure', category: 'pressure', unit: 'kPa', bytes: 1, decode: (a) => a, min: 0, max: 255, decimals: 0, source: SOURCE },
  { id: 'pressure.baro', pid: 0x33, label: 'Barometric pressure', category: 'pressure', unit: 'kPa', bytes: 1, decode: (a) => a, min: 0, max: 255, decimals: 0, source: SOURCE },

  // Air intake & throttle
  { id: 'air.maf', pid: 0x10, label: 'Mass air flow', category: 'air-throttle', unit: 'g/s', bytes: 2, decode: (a, b) => word(a, b) / 100, min: 0, max: 655.35, decimals: 2, source: SOURCE },
  { id: 'throttle.position', pid: 0x11, label: 'Throttle position', category: 'air-throttle', unit: '%', bytes: 1, decode: (a) => percent(a), min: 0, max: 100, decimals: 1, source: SOURCE },
  { id: 'throttle.relative', pid: 0x45, label: 'Relative throttle position', category: 'air-throttle', unit: '%', bytes: 1, decode: (a) => percent(a), min: 0, max: 100, decimals: 1, source: SOURCE },
  { id: 'throttle.pedal', pid: 0x49, label: 'Accelerator pedal position', category: 'air-throttle', unit: '%', bytes: 1, decode: (a) => percent(a), min: 0, max: 100, decimals: 1, source: SOURCE },

  // Fuel system
  { id: 'fuel.trim.short.b1', pid: 0x06, label: 'Short-term fuel trim, bank 1', category: 'fuel', unit: '%', bytes: 1, decode: (a) => trim(a), min: -100, max: 99.22, decimals: 1, source: SOURCE },
  { id: 'fuel.trim.long.b1', pid: 0x07, label: 'Long-term fuel trim, bank 1', category: 'fuel', unit: '%', bytes: 1, decode: (a) => trim(a), min: -100, max: 99.22, decimals: 1, source: SOURCE },
  { id: 'fuel.trim.short.b2', pid: 0x08, label: 'Short-term fuel trim, bank 2', category: 'fuel', unit: '%', bytes: 1, decode: (a) => trim(a), min: -100, max: 99.22, decimals: 1, source: SOURCE },
  { id: 'fuel.trim.long.b2', pid: 0x09, label: 'Long-term fuel trim, bank 2', category: 'fuel', unit: '%', bytes: 1, decode: (a) => trim(a), min: -100, max: 99.22, decimals: 1, source: SOURCE },
  { id: 'fuel.level', pid: 0x2f, label: 'Fuel level', category: 'fuel', unit: '%', bytes: 1, decode: (a) => percent(a), min: 0, max: 100, decimals: 0, source: SOURCE },
  { id: 'fuel.rate', pid: 0x5e, label: 'Engine fuel rate', category: 'fuel', unit: 'L/h', bytes: 2, decode: (a, b) => word(a, b) / 20, min: 0, max: 3276.75, decimals: 2, source: SOURCE },

  // Ignition & combustion
  { id: 'ignition.timing', pid: 0x0e, label: 'Timing advance', category: 'ignition', unit: '°', bytes: 1, decode: (a) => a / 2 - 64, min: -64, max: 63.5, decimals: 1, source: SOURCE },

  // Electrical. This is the control module's supply voltage, NOT a battery-terminal measurement.
  { id: 'electrical.ecu.voltage', pid: 0x42, label: 'Control module voltage', category: 'electrical', unit: 'V', bytes: 2, decode: (a, b) => word(a, b) / 1000, min: 0, max: 65.535, decimals: 2, source: SOURCE },

  // Vehicle & ECU information
  { id: 'vehicle.runtime', pid: 0x1f, label: 'Run time since engine start', category: 'vehicle-info', unit: 's', bytes: 2, decode: (a, b) => word(a, b), min: 0, max: 65535, decimals: 0, source: SOURCE },
  { id: 'vehicle.distance.mil', pid: 0x21, label: 'Distance driven with warning light on', category: 'vehicle-info', unit: 'km', bytes: 2, decode: (a, b) => word(a, b), min: 0, max: 65535, decimals: 0, source: SOURCE },
  { id: 'vehicle.distance.cleared', pid: 0x31, label: 'Distance since codes cleared', category: 'vehicle-info', unit: 'km', bytes: 2, decode: (a, b) => word(a, b), min: 0, max: 65535, decimals: 0, source: SOURCE },
];

const BY_PID = new Map<number, SensorDef>(MODE01_SENSORS.map((s) => [s.pid, s]));

const BY_ID = new Map<string, SensorDef>(MODE01_SENSORS.map((s) => [s.id, s]));

export function getSensorByPid(pid: number): SensorDef | null {
  return BY_PID.get(pid) ?? null;
}

export function getSensorById(id: string): SensorDef | null {
  return BY_ID.get(id) ?? null;
}
