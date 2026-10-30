// MOCK DATA: design preview only. Production code must never import from src/mock (enforced by ESLint).
import type { Reading, ReadingStatus } from '@/types/telemetry';

const SOURCE = 'Mock · preview only';

export function makePreviewReadings(now: number): Record<ReadingStatus, { label: string; reading: Reading }> {
  return {
    live: {
      label: 'Engine RPM',
      reading: { sensorId: 'preview.rpm', value: 2450, unit: 'rpm', status: 'live', source: SOURCE, timestamp: now },
    },
    stale: {
      label: 'Coolant temperature',
      reading: { sensorId: 'preview.coolant', value: 92, unit: '°C', status: 'stale', source: SOURCE, timestamp: now - 4000 },
    },
    unsupported: {
      label: 'Oil temperature',
      reading: { sensorId: 'preview.oil', value: null, unit: '°C', status: 'unsupported', source: SOURCE, timestamp: null },
    },
    unknown: {
      label: 'Mass air flow',
      reading: { sensorId: 'preview.maf', value: null, unit: 'g/s', status: 'unknown', source: SOURCE, timestamp: null },
    },
    error: {
      label: 'Fuel level',
      reading: {
        sensorId: 'preview.fuel',
        value: null,
        unit: '%',
        status: 'error',
        source: SOURCE,
        timestamp: null,
        error: { code: 'NO_DATA', message: 'No response' },
      },
    },
  };
}
