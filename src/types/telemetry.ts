/**
 * The telemetry data contract. A reading is NOT valid just because it has a number:
 * status decides how (and whether) the value may be shown.
 */
export type ReadingStatus = 'live' | 'stale' | 'unsupported' | 'unknown' | 'error';

export type ReadingErrorCode = 'NO_DATA' | 'TIMEOUT' | 'MALFORMED' | 'OUT_OF_RANGE';

export type Reading = {
  sensorId: string;
  value: number | string | null;
  unit: string;
  status: ReadingStatus;
  source: string;
  /** ms epoch of the last successful decode, or null if never read */
  timestamp: number | null;
  error?: { code: ReadingErrorCode; message: string };
};

export type ConnectionState =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'initializing'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';
