import { CATEGORY_LABELS, CATEGORY_ORDER, MODE01_SENSORS, getSensorByPid, type SensorCategory, type SensorDef } from '../pid-registry/registry';
import type { VehicleCapabilities } from './capabilities';

export type SensorSection = { category: SensorCategory; title: string; data: SensorDef[] };

export type GroupedCapabilities = {
  sections: SensorSection[];
  /** Number of supported sensors Motryx can decode */
  readableCount: number;
  /** Supported PIDs Motryx has no decoder for yet (status data, oxygen sensors, ...) */
  unreadablePids: number[];
};

/** Splits what the car supports into what Motryx can read now, grouped by category, and what it cannot yet. */
export function groupSupportedSensors(capabilities: VehicleCapabilities): GroupedCapabilities {
  const supported = new Set(capabilities.supportedPids);
  const sections: SensorSection[] = [];

  for (const category of CATEGORY_ORDER) {
    const data = MODE01_SENSORS.filter((s) => s.category === category && supported.has(s.pid));
    if (data.length > 0) sections.push({ category, title: CATEGORY_LABELS[category], data });
  }

  return {
    sections,
    readableCount: sections.reduce((n, s) => n + s.data.length, 0),
    unreadablePids: capabilities.supportedPids.filter((pid) => getSensorByPid(pid) === null),
  };
}
