import type { Reading, ReadingErrorCode } from '@/types/telemetry';
import type { CommandResult } from '../adapter/responses';
import { decodeMode01 } from '../decoder/mode01';
import type { SensorDef } from '../pid-registry/registry';

function errorReading(def: SensorDef, code: ReadingErrorCode, message: string): Reading {
  return { sensorId: def.id, value: null, unit: def.unit, status: 'error', source: def.source, timestamp: null, error: { code, message } };
}

/**
 * Turns one adapter reply into a reading. Anything that is not a clean, in-range value becomes an
 * error reading with a reason, never a number. Returns null when the link is down: the connection
 * layer owns that state, so we do not report it as a sensor fault.
 */
export function readingFromReply(def: SensorDef, reply: CommandResult, now: number): Reading | null {
  if (reply.ok) {
    const decoded = decodeMode01(def, reply.lines);
    if (decoded.ok) {
      return { sensorId: def.id, value: decoded.value, unit: def.unit, status: 'live', source: def.source, timestamp: now };
    }
    return errorReading(
      def,
      decoded.error,
      decoded.error === 'OUT_OF_RANGE' ? 'Value out of range' : 'Unexpected reply',
    );
  }

  switch (reply.error) {
    case 'DISCONNECTED':
      return null;
    case 'NO_DATA':
    case 'UNABLE_TO_CONNECT':
      return errorReading(def, 'NO_DATA', 'No response');
    case 'TIMEOUT':
      return errorReading(def, 'TIMEOUT', 'Adapter timed out');
    case 'BUS_ERROR':
      return errorReading(def, 'MALFORMED', 'Communication error');
    default:
      return errorReading(def, 'MALFORMED', 'Unexpected reply');
  }
}
