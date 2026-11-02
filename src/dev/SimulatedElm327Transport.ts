// DEV ONLY: a fake ELM327 for tests and the developer simulator. Never used for real readings.
import {
  TransportError,
  type AdapterKind,
  type AdapterTarget,
  type Transport,
  type TransportErrorCode,
  type Unsubscribe,
} from '@/core/obd/transports/Transport';

export type SimScenario = 'healthy' | 'ignition-off' | 'silent';

export type SimOptions = {
  scenario?: SimScenario;
  latencyMs?: number;
  /** Split replies into chunks of this many characters, like a BLE link does. */
  chunkSize?: number;
  connectDelayMs?: number;
  failConnect?: TransportErrorCode | null;
  /** The next N connect() calls are refused. */
  failNextConnects?: number;
  /** Per-command reply delay, to simulate a slow ECU. */
  slowCommands?: Record<string, number>;
  /** Override the supported-PID bitmap for a range command such as "0120". null = the car does not answer. */
  bitmaps?: Record<string, number[] | null>;
};

/** A typical petrol car: 24 supported PIDs across three ranges (see the discovery tests). */
const DEFAULT_BITMAPS: Record<string, number[]> = {
  '0100': [0xbe, 0x1f, 0xa8, 0x13],
  '0120': [0x80, 0x02, 0xa0, 0x01],
  '0140': [0x44, 0x00, 0x00, 0x14],
};

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class SimulatedElm327Transport implements Transport {
  readonly kind: AdapterKind = 'ble';
  options: SimOptions;
  /** Commands that arrived while another was still being answered (should stay 0). */
  overlaps = 0;
  readonly commands: string[] = [];

  private connected = false;
  private echo = true;
  private spaces = true;
  private searched = false;
  private buffer = '';
  private inFlight: ReturnType<typeof setTimeout> | null = null;
  private readonly dataListeners = new Set<(chunk: string) => void>();
  private readonly dropListeners = new Set<(reason?: string) => void>();

  constructor(options: SimOptions = {}) {
    this.options = options;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  setScenario(scenario: SimScenario): void {
    this.options.scenario = scenario;
  }

  /** While unplugged, every connect attempt fails as "not found". */
  setUnplugged(unplugged: boolean): void {
    this.options.failConnect = unplugged ? 'NOT_FOUND' : null;
  }

  async connect(_target: AdapterTarget): Promise<void> {
    await delay(this.options.connectDelayMs ?? 0);
    if (this.options.failConnect) throw new TransportError(this.options.failConnect, 'Simulated connect failure');
    if ((this.options.failNextConnects ?? 0) > 0) {
      this.options.failNextConnects = (this.options.failNextConnects ?? 0) - 1;
      throw new TransportError('CONNECTION_REFUSED', 'Simulated refusal');
    }
    this.connected = true;
    this.echo = true;
    this.spaces = true;
    this.searched = false;
    this.buffer = '';
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.cancelInFlight();
  }

  /** Simulates the link dropping (adapter unplugged, out of range). */
  simulateDrop(reason = 'Simulated drop'): void {
    if (!this.connected) return;
    this.connected = false;
    this.cancelInFlight();
    this.dropListeners.forEach((listener) => listener(reason));
  }

  async write(data: string): Promise<void> {
    if (!this.connected) throw new TransportError('UNAVAILABLE', 'Not connected');
    this.buffer += data;
    for (;;) {
      const end = this.buffer.indexOf('\r');
      if (end === -1) break;
      const command = this.buffer.slice(0, end).trim();
      this.buffer = this.buffer.slice(end + 1);
      this.handle(command);
    }
  }

  onData(listener: (chunk: string) => void): Unsubscribe {
    this.dataListeners.add(listener);
    return () => {
      this.dataListeners.delete(listener);
    };
  }

  onDisconnect(listener: (reason?: string) => void): Unsubscribe {
    this.dropListeners.add(listener);
    return () => {
      this.dropListeners.delete(listener);
    };
  }

  private cancelInFlight(): void {
    if (this.inFlight) clearTimeout(this.inFlight);
    this.inFlight = null;
  }

  private handle(command: string): void {
    if (command === '') {
      // A bare carriage return interrupts a running command, like a real ELM327.
      if (this.inFlight) {
        this.cancelInFlight();
        this.emit('STOPPED\r\r>');
      } else {
        this.emit('\r>');
      }
      return;
    }
    this.commands.push(command);
    if (this.options.scenario === 'silent') return; // not an adapter: never answers

    if (this.inFlight) this.overlaps += 1;
    const echoed = this.echo ? `${command}\r` : '';
    const body = this.respond(command);
    const wait = this.options.slowCommands?.[command.replace(/\s+/g, '').toUpperCase()] ?? this.options.latencyMs ?? 0;
    this.inFlight = setTimeout(() => {
      this.inFlight = null;
      this.emit(`${echoed}${body}\r\r>`);
    }, wait);
  }

  private emit(text: string): void {
    const size = this.options.chunkSize ?? Number.POSITIVE_INFINITY;
    for (let i = 0; i < text.length; i += Number.isFinite(size) ? size : text.length) {
      const chunk = text.slice(i, i + (Number.isFinite(size) ? size : text.length));
      this.dataListeners.forEach((listener) => listener(chunk));
    }
  }

  private hex(bytes: number[]): string {
    const parts = bytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0'));
    return this.spaces ? `${parts.join(' ')} ` : parts.join('');
  }

  private respond(command: string): string {
    const c = command.replace(/\s+/g, '').toUpperCase();
    switch (c) {
      case 'ATZ':
        this.echo = true;
        this.spaces = true;
        return '\r\rELM327 v1.5';
      case 'ATE0':
        this.echo = false;
        return 'OK';
      case 'ATE1':
        this.echo = true;
        return 'OK';
      case 'ATS0':
        this.spaces = false;
        return 'OK';
      case 'ATS1':
        this.spaces = true;
        return 'OK';
      case 'ATL0':
      case 'ATL1':
      case 'ATH0':
      case 'ATH1':
      case 'ATSP0':
        return 'OK';
      case 'ATDPN':
        return 'A6';
      case 'ATDP':
        return 'AUTO, ISO 15765-4 (CAN 11/500)';
    }
    if (c.startsWith('AT')) return '?';

    if (c.startsWith('01') && this.options.scenario === 'ignition-off') return 'SEARCHING...\rUNABLE TO CONNECT';

    const search = this.searched ? '' : 'SEARCHING...\r';
    const overrides = this.options.bitmaps;
    if (overrides && c in overrides && overrides[c] === null) return 'NO DATA';
    const bitmap = overrides?.[c] ?? DEFAULT_BITMAPS[c];
    if (bitmap) {
      const first = c === '0100' ? search : '';
      if (c === '0100') this.searched = true;
      return first + this.hex([0x41, parseInt(c.slice(2), 16), ...bitmap]);
    }
    switch (c) {
      case '0105':
        return this.hex([0x41, 0x05, 0x7b]);
      case '010C':
        return this.hex([0x41, 0x0c, 0x1a, 0xf8]);
      case '010D':
        return this.hex([0x41, 0x0d, 0x3c]);
    }
    return /^[0-9A-F]+$/.test(c) ? 'NO DATA' : '?';
  }
}
