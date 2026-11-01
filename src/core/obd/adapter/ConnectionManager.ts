import type { AdapterTarget, Transport, Unsubscribe } from '../transports/Transport';
import { connectionReducer, INITIAL_SNAPSHOT, type ConnectionEvent, type ConnectionSnapshot } from './connectionMachine';
import { Elm327Client } from './Elm327Client';
import { mapTransportError, type AdapterError } from './errors';
import { initializeAdapter, type InitTimeouts } from './initialize';

export type ManagerOptions = {
  /** Waits before each automatic reconnect attempt. Default: 1 s, 2 s, 4 s, then give up. */
  backoffMs?: readonly number[];
  timeouts?: Partial<InitTimeouts>;
};

type Establish = { status: 'ok' } | { status: 'failed'; error: AdapterError } | { status: 'stale' };

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const ignore = () => undefined;

/**
 * Owns one adapter connection: connect, set up the protocol, notice drops, reconnect a few
 * times, and clean up. UI and storage only ever see snapshots; nothing here is React.
 */
export class ConnectionManager {
  private readonly transport: Transport;
  private readonly backoffMs: readonly number[];
  private readonly timeouts: Partial<InitTimeouts>;
  private readonly listeners = new Set<(snapshot: ConnectionSnapshot) => void>();
  private snapshot: ConnectionSnapshot = INITIAL_SNAPSHOT;
  private client: Elm327Client | null = null;
  /** Bumped on every user action or link loss; async work from an older generation is discarded. */
  private generation = 0;

  constructor(transport: Transport, options: ManagerOptions = {}) {
    this.transport = transport;
    this.backoffMs = options.backoffMs ?? [1000, 2000, 4000];
    this.timeouts = options.timeouts ?? {};
    transport.onDisconnect(() => this.handleLinkLost());
  }

  getSnapshot(): ConnectionSnapshot {
    return this.snapshot;
  }

  subscribe(listener: (snapshot: ConnectionSnapshot) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** The command client, only while truly connected. */
  getClient(): Elm327Client | null {
    return this.snapshot.state === 'connected' ? this.client : null;
  }

  /** For the scan screen: reflect that a scan is running. */
  setScanning(scanning: boolean): void {
    this.dispatch({ type: scanning ? 'SCAN_STARTED' : 'SCAN_STOPPED' });
  }

  async connect(target: AdapterTarget): Promise<void> {
    const busy = ['connecting', 'initializing', 'connected', 'reconnecting'];
    if (busy.includes(this.snapshot.state)) return;

    const generation = ++this.generation;
    this.dispatch({ type: 'CONNECT_STARTED', target });

    const result = await this.establish(target, generation);
    if (result.status === 'failed') this.dispatch({ type: 'FAILED', error: result.error });
  }

  async disconnect(): Promise<void> {
    this.generation += 1; // cancels connects, initialization and reconnect loops in flight
    this.client?.dispose();
    this.client = null;
    this.dispatch({ type: 'DISCONNECT_REQUESTED' });
    await this.transport.disconnect().catch(ignore);
  }

  private dispatch(event: ConnectionEvent): void {
    const next = connectionReducer(this.snapshot, event);
    if (next === this.snapshot) return;
    this.snapshot = next;
    this.listeners.forEach((listener) => listener(next));
  }

  /** Transport connect + protocol init. Dispatches progress; the caller decides what a failure means. */
  private async establish(target: AdapterTarget, generation: number): Promise<Establish> {
    try {
      await this.transport.connect(target);
    } catch (error) {
      return generation === this.generation ? { status: 'failed', error: mapTransportError(error) } : { status: 'stale' };
    }
    if (generation !== this.generation) {
      await this.transport.disconnect().catch(ignore);
      return { status: 'stale' };
    }

    this.dispatch({ type: 'TRANSPORT_CONNECTED' });
    const client = new Elm327Client(this.transport);
    const result = await initializeAdapter(client, this.timeouts);

    if (generation !== this.generation) {
      client.dispose();
      return { status: 'stale' };
    }
    if (!result.ok) {
      client.dispose();
      await this.transport.disconnect().catch(ignore);
      return { status: 'failed', error: { code: result.error } };
    }

    this.client = client;
    this.dispatch({ type: 'INIT_SUCCEEDED', info: result.info });
    return { status: 'ok' };
  }

  /** Called by the transport for unexpected drops only. */
  private handleLinkLost(): void {
    const { state, attempt, target } = this.snapshot;

    if (state === 'connected' && target) {
      this.client?.dispose();
      this.client = null;
      const generation = ++this.generation;
      this.dispatch({ type: 'LINK_LOST' });
      void this.reconnect(target, generation);
    } else if ((state === 'connecting' || state === 'initializing') && attempt === 0) {
      this.generation += 1;
      this.client?.dispose();
      this.client = null;
      this.dispatch({ type: 'FAILED', error: { code: 'DISCONNECTED' } });
    }
    // During a reconnect cycle the loop itself handles failed attempts.
  }

  private async reconnect(target: AdapterTarget, generation: number): Promise<void> {
    for (let i = 0; i < this.backoffMs.length; i++) {
      await sleep(this.backoffMs[i] ?? 0);
      if (generation !== this.generation) return;

      this.dispatch({ type: 'RECONNECT_ATTEMPT', attempt: i + 1 });
      const result = await this.establish(target, generation);
      if (result.status === 'ok' || result.status === 'stale') return;
    }
    if (generation === this.generation) this.dispatch({ type: 'RECONNECT_GAVE_UP' });
  }
}
