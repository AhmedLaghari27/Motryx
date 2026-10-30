/** Canonical values are metric (°C, km/h, kPa). Convert only at display time. */
export type UnitSystem = 'metric' | 'imperial';

const KMH_PER_MPH = 1.609344;
const PSI_PER_KPA = 0.14503773773;

export type Converted = { value: number; unit: string };

export function convertTemperature(celsius: number, system: UnitSystem): Converted {
  return system === 'imperial'
    ? { value: (celsius * 9) / 5 + 32, unit: '°F' }
    : { value: celsius, unit: '°C' };
}

export function convertSpeed(kmh: number, system: UnitSystem): Converted {
  return system === 'imperial' ? { value: kmh / KMH_PER_MPH, unit: 'mph' } : { value: kmh, unit: 'km/h' };
}

export function convertPressure(kpa: number, system: UnitSystem): Converted {
  return system === 'imperial' ? { value: kpa * PSI_PER_KPA, unit: 'psi' } : { value: kpa, unit: 'kPa' };
}

/** Fixed-decimal text. Never returns "-0"; non-finite input gives "—", never a fake zero. */
export function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '—';
  const text = value.toFixed(decimals);
  return Number(text) === 0 ? (0).toFixed(decimals) : text;
}
