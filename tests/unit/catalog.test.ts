import type { VehicleCapabilities } from '@/core/obd/discovery/capabilities';
import { buildCatalog, filterCatalog, type CatalogFilter } from '@/features/live-data/catalog';

const caps: VehicleCapabilities = {
  discoveredAt: 1,
  supportedPids: [0x05, 0x0c, 0x0d, 0x0f, 0x2f],
  highestRangeBase: 0x20,
  complete: true,
};
const items = buildCatalog(caps);
const filter = (over: Partial<CatalogFilter> = {}): CatalogFilter => ({ query: '', favoritesOnly: false, showUnsupported: false, ...over });
const ids = (sections: ReturnType<typeof filterCatalog>) => sections.flatMap((s) => s.data.map((i) => i.sensor.id));

describe('catalog', () => {
  it('marks each sensor with what the car said', () => {
    const byId = Object.fromEntries(items.map((i) => [i.sensor.id, i.availability]));
    expect(byId['engine.rpm']).toBe('supported');
    expect(byId['temp.oil']).toBe('unknown'); // 0x5C is beyond the ranges that were read
    expect(byId['air.maf']).toBe('unsupported'); // inside a range that was read, bit clear
  });

  it('hides unsupported sensors by default and shows only what the car reports', () => {
    expect(new Set(ids(filterCatalog(items, filter(), new Set())))).toEqual(
      new Set(['engine.rpm', 'vehicle.speed', 'temp.coolant', 'temp.intake', 'fuel.level']),
    );
  });

  it('can reveal the rest, listed after the supported ones', () => {
    const sections = filterCatalog(items, filter({ showUnsupported: true }), new Set());
    const temps = sections.find((s) => s.category === 'temperature');
    // coolant and intake air are supported; ambient and oil are beyond the ranges that were read
    expect(temps?.data.map((i) => [i.sensor.id, i.availability])).toEqual([
      ['temp.coolant', 'supported'],
      ['temp.intake', 'supported'],
      ['temp.ambient', 'unknown'],
      ['temp.oil', 'unknown'],
    ]);

    const air = sections.find((s) => s.category === 'air-throttle');
    // "unknown" (never asked) sorts before "unsupported" (asked, and the car said no)
    expect(air?.data.map((i) => [i.sensor.id, i.availability])).toEqual([
      ['throttle.relative', 'unknown'],
      ['throttle.pedal', 'unknown'],
      ['air.maf', 'unsupported'],
      ['throttle.position', 'unsupported'],
    ]);
  });

  it('searches by name, category, id and PID, ignoring case', () => {
    const find = (query: string) => ids(filterCatalog(items, filter({ query }), new Set()));
    expect(find('COOLANT')).toEqual(['temp.coolant']);
    expect(find('temperatures')).toEqual(['temp.coolant', 'temp.intake']);
    expect(find('0c')).toEqual(['engine.rpm']);
    expect(find('pid 0d')).toEqual(['vehicle.speed']);
    expect(find('engine.rpm')).toEqual(['engine.rpm']);
    // category names are searchable too, so "rpm" also lists the other sensors under "Engine & RPM"
    expect(find('  rpm  ')).toEqual(['engine.rpm', 'vehicle.speed']);
    expect(find('nothing like this')).toEqual([]);
  });

  it('requires every word of a multi-word search to match', () => {
    expect(ids(filterCatalog(items, filter({ query: 'intake air' }), new Set()))).toEqual(['temp.intake']);
  });

  it('filters to favorites', () => {
    const favs = new Set(['engine.rpm', 'fuel.level']);
    expect(ids(filterCatalog(items, filter({ favoritesOnly: true }), favs)).sort()).toEqual(['engine.rpm', 'fuel.level']);
    expect(ids(filterCatalog(items, filter({ favoritesOnly: true }), new Set()))).toEqual([]);
  });

  it('keeps sections in the standard category order and drops empty ones', () => {
    const titles = filterCatalog(items, filter(), new Set()).map((s) => s.title);
    expect(titles).toEqual(['Engine & RPM', 'Temperatures', 'Fuel system']);
  });
});
