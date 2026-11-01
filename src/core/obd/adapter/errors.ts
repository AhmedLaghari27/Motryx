import { TransportError } from '../transports/Transport';

/** What went wrong, from the person's point of view. */
export type AdapterErrorCode =
  | 'PERMISSION_DENIED'
  | 'TRANSPORT_UNAVAILABLE'
  | 'ADAPTER_NOT_FOUND'
  | 'CONNECTION_REFUSED'
  | 'CONNECT_TIMEOUT'
  | 'NOT_AN_ELM327'
  | 'ADAPTER_TIMEOUT'
  | 'VEHICLE_NOT_RESPONDING'
  | 'BUS_ERROR'
  | 'DISCONNECTED'
  | 'MALFORMED'
  | 'UNKNOWN';

export type AdapterError = { code: AdapterErrorCode; message?: string };

export type ErrorCopy = { title: string; message: string; action: string | null };

/** Plain, specific wording: say what happened and what to do next. */
export function describeAdapterError(code: AdapterErrorCode): ErrorCopy {
  switch (code) {
    case 'PERMISSION_DENIED':
      return { title: 'Permission needed', message: 'Allow access so Motryx can find your adapter.', action: 'Review permissions' };
    case 'TRANSPORT_UNAVAILABLE':
      return {
        title: 'Connection is unavailable',
        message: 'Turn on Bluetooth, or join the adapter’s Wi-Fi network, then try again.',
        action: 'Try again',
      };
    case 'ADAPTER_NOT_FOUND':
      return {
        title: 'Adapter not found',
        message: 'Plug the adapter into the OBD-II port and turn the ignition on, then scan again.',
        action: 'Scan again',
      };
    case 'CONNECTION_REFUSED':
      return {
        title: 'The adapter refused the connection',
        message: 'Another phone or app may already be connected to it. Disconnect that one and try again.',
        action: 'Try again',
      };
    case 'CONNECT_TIMEOUT':
      return { title: 'Connection timed out', message: 'Move closer to the adapter and try again.', action: 'Try again' };
    case 'NOT_AN_ELM327':
      return {
        title: 'The device did not answer like an OBD adapter',
        message: 'Check that you picked your OBD-II adapter and not another device.',
        action: 'Choose another device',
      };
    case 'ADAPTER_TIMEOUT':
      return {
        title: 'The adapter stopped responding',
        message: 'Unplug it for a few seconds, plug it back in, then reconnect.',
        action: 'Reconnect',
      };
    case 'VEHICLE_NOT_RESPONDING':
      return {
        title: 'Adapter connected, but the car did not answer',
        message: 'Turn the ignition on. Some cars only answer with the engine running.',
        action: 'Try again',
      };
    case 'BUS_ERROR':
      return {
        title: 'Communication error with the car',
        message: 'Turn the ignition off and on again, then reconnect.',
        action: 'Reconnect',
      };
    case 'DISCONNECTED':
      return {
        title: 'Connection lost',
        message: 'Check that the adapter is still plugged in, then reconnect.',
        action: 'Reconnect',
      };
    case 'MALFORMED':
      return {
        title: 'Unexpected reply from the adapter',
        message: 'Try reconnecting. If it keeps happening, note your adapter model and report it.',
        action: 'Reconnect',
      };
    case 'UNKNOWN':
      return { title: 'Something went wrong', message: 'Try again.', action: 'Try again' };
  }
}

export function mapTransportError(error: unknown): AdapterError {
  if (error instanceof TransportError) {
    const byCode: Record<TransportError['code'], AdapterErrorCode> = {
      PERMISSION_DENIED: 'PERMISSION_DENIED',
      NOT_FOUND: 'ADAPTER_NOT_FOUND',
      CONNECTION_REFUSED: 'CONNECTION_REFUSED',
      TIMEOUT: 'CONNECT_TIMEOUT',
      UNAVAILABLE: 'TRANSPORT_UNAVAILABLE',
      UNKNOWN: 'UNKNOWN',
    };
    return { code: byCode[error.code], message: error.message };
  }
  return { code: 'UNKNOWN', message: error instanceof Error ? error.message : String(error) };
}
