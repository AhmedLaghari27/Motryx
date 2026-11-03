import type { VehicleCapabilities, PidStatus } from '@/core/obd/discovery/capabilities';
import { pidStatus } from '@/core/obd/discovery/capabilities';
import { hex2 } from '@/core/obd/decoder/mode01';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  MODE01_SENSORS,
  type SensorCategory,
  type SensorDef,
} from '@/core/obd/pid-registry/registry';

export type CatalogItem = { sensor: SensorDef; availability: PidStatus };
export type CatalogSection = { category: SensorCategory; title: string; data: CatalogItem[] };
export type CatalogFilter = { query: string; favoritesOnly: boolean; showUnsupported: boolean };

/** Every sensor Motryx knows, each marked with what THIS car said about it. */
export function buildCatalog(capabilities: VehicleCapabilities): CatalogItem[] {
  return MODE01_SENSORS.map((sensor) => ({ sensor, availability: pidStatus(capabilities, sensor.pid) }));
}

const RANK: Record<PidStatus, number> = { supported: 0, unknown: 1, unsupported: 2 };

function matches(item: CatalogItem, query: string): boolean {
  if (query === '') return true;
  const { sensor } = item;
  const haystack = [sensor.label, CATEGORY_LABELS[sensor.category], sensor.id, hex2(sensor.pid), `pid ${hex2(sensor.pid)}`]
    .join(' ')
    .toLowerCase();
  return query.split(/\s+/).every((word) => haystack.includes(word));
}

/**
 * Applies search and filters, then groups by category. Unsupported sensors stay hidden unless asked
 * for, and supported ones always come first.
 */
export function filterCatalog(items: readonly CatalogItem[], filter: CatalogFilter, favorites: ReadonlySet<string>): CatalogSection[] {
  const query = filter.query.trim().toLowerCase();
  const visible = items.filter(
    (item) =>
      (filter.showUnsupported || item.availability === 'supported') &&
      (!filter.favoritesOnly || favorites.has(item.sensor.id)) &&
      matches(item, query),
  );

  const sections: CatalogSection[] = [];
  for (const category of CATEGORY_ORDER) {
    const data = visible
      .filter((item) => item.sensor.category === category)
      .sort((a, b) => RANK[a.availability] - RANK[b.availability]);
    if (data.length > 0) sections.push({ category, title: CATEGORY_LABELS[category], data });
  }
  return sections;
}
