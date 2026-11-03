import { useCallback, useSyncExternalStore } from 'react';
import type { Reading } from '@/types/telemetry';
import { telemetry } from './instances';

/** The latest reading for one sensor. Re-renders only when THAT sensor changes. */
export function useReading(sensorId: string): Reading | undefined {
  const subscribe = useCallback((onChange: () => void) => telemetry.subscribe(sensorId, onChange), [sensorId]);
  return useSyncExternalStore(subscribe, () => telemetry.get(sensorId));
}
