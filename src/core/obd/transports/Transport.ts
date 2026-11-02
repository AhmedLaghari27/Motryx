export type AdapterKind = 'ble' | 'classic' | 'wifi';

/** Where to connect. Bluetooth uses a device id; Wi-Fi uses "host:port". */
export type AdapterTarget = {
  id: string;
  name: string | null;
  kind: AdapterKind;
  /** True only for the developer simulator, so the UI can say the data is not real. */
  simulated?: boolean;
};

export type Unsubscribe = () => void;

export type TransportErrorCode =
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'CONNECTION_REFUSED'
  | 'TIMEOUT'
  | 'UNAVAILABLE' // Bluetooth off, not on the adapter's Wi-Fi, etc.
  | 'UNKNOWN';

export class TransportError extends Error {
  readonly code: TransportErrorCode;
  constructor(code: TransportErrorCode, message: string) {
    super(message);
    this.name = 'TransportError';
    this.code = code;
  }
}

/**
 * One physical link to an adapter (BLE, classic Bluetooth or Wi-Fi). The ELM327 protocol layer
 * sits on top and never knows which one it is using.
 *
 * Contract: onDisconnect fires ONLY for unexpected drops, never after our own disconnect().
 * connect() must reject with a TransportError. write() sends text exactly as given.
 */
export interface Transport {
  readonly kind: AdapterKind;
  connect(target: AdapterTarget): Promise<void>;
  disconnect(): Promise<void>;
  write(data: string): Promise<void>;
  onData(listener: (chunk: string) => void): Unsubscribe;
  onDisconnect(listener: (reason?: string) => void): Unsubscribe;
}
