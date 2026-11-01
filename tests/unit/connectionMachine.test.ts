import {
  connectionReducer,
  INITIAL_SNAPSHOT,
  type ConnectionEvent,
  type ConnectionSnapshot,
} from '@/core/obd/adapter/connectionMachine';

const target = { id: 'a', name: 'ELM', kind: 'ble' } as const;
const info = { version: 'ELM327 v1.5', protocolNumber: '6', protocolName: 'CAN' };

const run = (events: ConnectionEvent[], from: ConnectionSnapshot = INITIAL_SNAPSHOT) =>
  events.reduce(connectionReducer, from);

describe('connectionReducer', () => {
  it('follows the happy path', () => {
    const s = run([{ type: 'CONNECT_STARTED', target }, { type: 'TRANSPORT_CONNECTED' }, { type: 'INIT_SUCCEEDED', info }]);
    expect(s).toMatchObject({ state: 'connected', info, error: null, attempt: 0, target });
  });

  it('shows scanning, and returns to idle when the scan stops', () => {
    expect(run([{ type: 'SCAN_STARTED' }]).state).toBe('scanning');
    expect(run([{ type: 'SCAN_STARTED' }, { type: 'SCAN_STOPPED' }]).state).toBe('idle');
  });

  it('records a failure with its error', () => {
    const s = run([{ type: 'CONNECT_STARTED', target }, { type: 'FAILED', error: { code: 'ADAPTER_NOT_FOUND' } }]);
    expect(s).toMatchObject({ state: 'error', error: { code: 'ADAPTER_NOT_FOUND' }, info: null });
  });

  it('allows trying again from an error', () => {
    const failed = run([{ type: 'CONNECT_STARTED', target }, { type: 'FAILED', error: { code: 'UNKNOWN' } }]);
    expect(run([{ type: 'CONNECT_STARTED', target }], failed)).toMatchObject({ state: 'connecting', error: null });
  });

  it('reconnects after a lost link, counting attempts', () => {
    const connected = run([{ type: 'CONNECT_STARTED', target }, { type: 'TRANSPORT_CONNECTED' }, { type: 'INIT_SUCCEEDED', info }]);
    const s = run(
      [
        { type: 'LINK_LOST' },
        { type: 'RECONNECT_ATTEMPT', attempt: 1 },
        { type: 'TRANSPORT_CONNECTED' },
        { type: 'RECONNECT_ATTEMPT', attempt: 2 }, // attempt 1's setup failed, so we try again
      ],
      connected,
    );
    expect(s).toMatchObject({ state: 'reconnecting', attempt: 2 });
  });

  it('gives up into "disconnected" after the last attempt fails', () => {
    const connected = run([{ type: 'CONNECT_STARTED', target }, { type: 'TRANSPORT_CONNECTED' }, { type: 'INIT_SUCCEEDED', info }]);
    const s = run([{ type: 'LINK_LOST' }, { type: 'RECONNECT_ATTEMPT', attempt: 1 }, { type: 'RECONNECT_GAVE_UP' }], connected);
    expect(s).toMatchObject({ state: 'disconnected', error: { code: 'DISCONNECTED' } });
  });

  it('returns to idle when the user disconnects, from anywhere', () => {
    expect(run([{ type: 'CONNECT_STARTED', target }, { type: 'DISCONNECT_REQUESTED' }])).toEqual(INITIAL_SNAPSHOT);
  });

  it('ignores events that make no sense, returning the same object', () => {
    expect(connectionReducer(INITIAL_SNAPSHOT, { type: 'INIT_SUCCEEDED', info })).toBe(INITIAL_SNAPSHOT);
    expect(connectionReducer(INITIAL_SNAPSHOT, { type: 'LINK_LOST' })).toBe(INITIAL_SNAPSHOT);
    expect(connectionReducer(INITIAL_SNAPSHOT, { type: 'DISCONNECT_REQUESTED' })).toBe(INITIAL_SNAPSHOT);
    const connecting = run([{ type: 'CONNECT_STARTED', target }]);
    expect(connectionReducer(connecting, { type: 'CONNECT_STARTED', target })).toBe(connecting);
  });
});
