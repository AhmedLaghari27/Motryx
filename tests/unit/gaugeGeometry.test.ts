import { arcPath, polar, tickLine, valueToAngle } from '@/utils/gaugeGeometry';

describe('gauge geometry', () => {
  it('maps the dial fraction to a 240 degree sweep and clamps', () => {
    expect(valueToAngle(0)).toBe(150);
    expect(valueToAngle(0.5)).toBe(270);
    expect(valueToAngle(1)).toBe(390);
    expect(valueToAngle(-1)).toBe(150);
    expect(valueToAngle(3)).toBe(390);
  });

  it('puts the top of the dial straight above the centre', () => {
    const p = polar(100, 100, 80, 270);
    expect(p.x).toBeCloseTo(100, 6);
    expect(p.y).toBeCloseTo(20, 6);
  });

  it('builds arc paths and picks the large-arc flag by sweep', () => {
    expect(arcPath(100, 100, 78, 0, 1)).toMatch(/^M [\d.]+ [\d.]+ A 78 78 0 1 1 /);
    expect(arcPath(100, 100, 78, 0.84, 1)).toMatch(/A 78 78 0 0 1 /);
  });

  it('draws ticks radially', () => {
    const t = tickLine(100, 100, 87, 95, 0.5);
    expect(t.x1).toBeCloseTo(100, 6);
    expect(t.y1).toBeCloseTo(13, 6);
    expect(t.y2).toBeCloseTo(5, 6);
  });
});
