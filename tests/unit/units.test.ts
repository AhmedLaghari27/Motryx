import { convertPressure, convertSpeed, convertTemperature, formatNumber } from '@/utils/units';

describe('unit conversion', () => {
  it('converts temperature', () => {
    expect(convertTemperature(100, 'imperial')).toEqual({ value: 212, unit: '°F' });
    expect(convertTemperature(92, 'metric')).toEqual({ value: 92, unit: '°C' });
  });

  it('converts speed with the exact mile definition', () => {
    const r = convertSpeed(160.9344, 'imperial');
    expect(r.unit).toBe('mph');
    expect(r.value).toBeCloseTo(100, 6);
    expect(convertSpeed(100, 'metric')).toEqual({ value: 100, unit: 'km/h' });
  });

  it('converts pressure', () => {
    expect(convertPressure(100, 'imperial').value).toBeCloseTo(14.5038, 3);
    expect(convertPressure(101, 'metric')).toEqual({ value: 101, unit: 'kPa' });
  });
});

describe('formatNumber', () => {
  it('rounds to the requested decimals', () => {
    expect(formatNumber(2450.4)).toBe('2450');
    expect(formatNumber(1.256, 1)).toBe('1.3');
  });
  it('never shows negative zero', () => {
    expect(formatNumber(-0.04)).toBe('0');
    expect(formatNumber(-0.04, 1)).toBe('0.0');
  });
  it('shows a dash, not zero, for non-finite input', () => {
    expect(formatNumber(NaN)).toBe('—');
    expect(formatNumber(Infinity)).toBe('—');
  });
});
