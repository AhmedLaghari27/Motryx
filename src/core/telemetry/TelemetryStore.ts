import type { Reading } from '@/types/telemetry';

type Listener = () => void;

/**
 * The latest reading per sensor, kept apart from history so a fast sensor only re-renders
 * the tile that shows it. Subscribers listen to ONE sensor id.
 */
export class TelemetryStore {
  private readonly readings = new Map<string, Reading>();
  private readonly listeners = new Map<string, Set<Listener>>();

  get(sensorId: string): Reading | undefined {
    return this.readings.get(sensorId);
  }

  set(reading: Reading): void {
    this.readings.set(reading.sensorId, reading);
    this.notify(reading.sensorId);
  }

  subscribe(sensorId: string, listener: Listener): () => void {
    let set = this.listeners.get(sensorId);
    if (!set) {
      set = new Set();
      this.listeners.set(sensorId, set);
    }
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }

  /** Live readings older than their allowed age become stale. Never shows old data as live. */
  markStale(now: number, staleAfterMs: (sensorId: string) => number): void {
    for (const reading of this.readings.values()) {
      if (reading.status !== 'live' || reading.timestamp === null) continue;
      if (now - reading.timestamp > staleAfterMs(reading.sensorId)) this.set({ ...reading, status: 'stale' });
    }
  }

  /** When the link drops: everything that was live is now stale, immediately. */
  markAllStale(): void {
    for (const reading of this.readings.values()) {
      if (reading.status === 'live') this.set({ ...reading, status: 'stale' });
    }
  }

  clear(): void {
    const ids = [...this.readings.keys()];
    this.readings.clear();
    ids.forEach((id) => this.notify(id));
  }

  private notify(sensorId: string): void {
    this.listeners.get(sensorId)?.forEach((listener) => listener());
  }
}
