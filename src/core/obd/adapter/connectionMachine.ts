import type { ConnectionState } from '@/types/telemetry';
import type { AdapterError } from './errors';
import type { AdapterInfo } from './initialize';
import type { AdapterTarget } from '../transports/Transport';

export type ConnectionSnapshot = {
  state: ConnectionState;
  error: AdapterError | null;
  info: AdapterInfo | null;
  target: AdapterTarget | null;
  /** 0 normally; 1, 2, 3... while automatically reconnecting */
  attempt: number;
};

export type ConnectionEvent =
  | { type: 'SCAN_STARTED' }
  | { type: 'SCAN_STOPPED' }
  | { type: 'CONNECT_STARTED'; target: AdapterTarget }
  | { type: 'TRANSPORT_CONNECTED' }
  | { type: 'INIT_SUCCEEDED'; info: AdapterInfo }
  | { type: 'FAILED'; error: AdapterError }
  | { type: 'LINK_LOST' }
  | { type: 'RECONNECT_ATTEMPT'; attempt: number }
  | { type: 'RECONNECT_GAVE_UP' }
  | { type: 'DISCONNECT_REQUESTED' };

export const INITIAL_SNAPSHOT: ConnectionSnapshot = {
  state: 'idle',
  error: null,
  info: null,
  target: null,
  attempt: 0,
};

const CAN_START: readonly ConnectionState[] = ['idle', 'scanning', 'disconnected', 'error'];

/**
 * Pure transition table. An event that makes no sense in the current state is ignored and
 * the same snapshot object is returned, so callers can detect "nothing changed".
 */
export function connectionReducer(s: ConnectionSnapshot, e: ConnectionEvent): ConnectionSnapshot {
  switch (e.type) {
    case 'SCAN_STARTED':
      return s.state === 'idle' || s.state === 'disconnected' || s.state === 'error'
        ? { ...s, state: 'scanning', error: null }
        : s;
    case 'SCAN_STOPPED':
      return s.state === 'scanning' ? { ...s, state: 'idle' } : s;
    case 'CONNECT_STARTED':
      return CAN_START.includes(s.state)
        ? { state: 'connecting', error: null, info: null, target: e.target, attempt: 0 }
        : s;
    case 'TRANSPORT_CONNECTED':
      return s.state === 'connecting' || s.state === 'reconnecting' ? { ...s, state: 'initializing' } : s;
    case 'INIT_SUCCEEDED':
      return s.state === 'initializing' ? { ...s, state: 'connected', info: e.info, error: null, attempt: 0 } : s;
    case 'FAILED':
      return s.state === 'scanning' || s.state === 'connecting' || s.state === 'initializing'
        ? { ...s, state: 'error', error: e.error, info: null }
        : s;
    case 'LINK_LOST':
      return s.state === 'connected' ? { ...s, state: 'reconnecting', info: null, attempt: 0 } : s;
    case 'RECONNECT_ATTEMPT':
      // A failed attempt leaves us "initializing", so the next attempt may start from there too.
      return s.state === 'reconnecting' || (s.state === 'initializing' && s.attempt > 0)
        ? { ...s, state: 'reconnecting', attempt: e.attempt }
        : s;
    case 'RECONNECT_GAVE_UP':
      return s.attempt > 0 && (s.state === 'reconnecting' || s.state === 'initializing')
        ? { ...s, state: 'disconnected', error: { code: 'DISCONNECTED' }, info: null }
        : s;
    case 'DISCONNECT_REQUESTED':
      return s.state === 'idle' ? s : INITIAL_SNAPSHOT;
  }
}
