import { describeAdapterError, mapTransportError, type AdapterErrorCode } from '@/core/obd/adapter/errors';
import { TransportError } from '@/core/obd/transports/Transport';

const ALL: AdapterErrorCode[] = [
  'PERMISSION_DENIED', 'TRANSPORT_UNAVAILABLE', 'ADAPTER_NOT_FOUND', 'CONNECTION_REFUSED', 'CONNECT_TIMEOUT',
  'NOT_AN_ELM327', 'ADAPTER_TIMEOUT', 'VEHICLE_NOT_RESPONDING', 'BUS_ERROR', 'DISCONNECTED', 'MALFORMED', 'UNKNOWN',
];

describe('describeAdapterError', () => {
  it('has a title and an instruction for every error', () => {
    for (const code of ALL) {
      const copy = describeAdapterError(code);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.message.length).toBeGreaterThan(0);
    }
  });

  it('tells people to turn the ignition on when the car is silent', () => {
    expect(describeAdapterError('VEHICLE_NOT_RESPONDING').message).toMatch(/ignition/i);
  });
});

describe('mapTransportError', () => {
  it('maps transport failures to person-level errors', () => {
    expect(mapTransportError(new TransportError('NOT_FOUND', 'x')).code).toBe('ADAPTER_NOT_FOUND');
    expect(mapTransportError(new TransportError('TIMEOUT', 'x')).code).toBe('CONNECT_TIMEOUT');
    expect(mapTransportError(new TransportError('UNAVAILABLE', 'x')).code).toBe('TRANSPORT_UNAVAILABLE');
  });
  it('treats anything else as unknown', () => {
    expect(mapTransportError(new Error('boom'))).toEqual({ code: 'UNKNOWN', message: 'boom' });
    expect(mapTransportError('weird').code).toBe('UNKNOWN');
  });
});
