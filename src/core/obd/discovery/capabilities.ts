export type VehicleCapabilities = {
  discoveredAt: number;
  /** Sensor PIDs the car reports (the range-announcing PIDs 00, 20, 40... are not included) */
  supportedPids: number[];
  /** The last range we actually got an answer for. Anything beyond it is unknown, not unsupported. */
  highestRangeBase: number;
  /** false if discovery stopped early, so some sensors may be missing */
  complete: boolean;
};

export type PidStatus = 'supported' | 'unsupported' | 'unknown';

/** Supported if announced; unsupported if its range was answered without it; otherwise unknown. */
export function pidStatus(capabilities: VehicleCapabilities, pid: number): PidStatus {
  if (capabilities.supportedPids.includes(pid)) return 'supported';
  return pid <= capabilities.highestRangeBase + 0x20 ? 'unsupported' : 'unknown';
}
