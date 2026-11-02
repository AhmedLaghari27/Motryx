import { pidStatus, type VehicleCapabilities } from '@/core/obd/discovery/capabilities';
import { bitmapToPids, extractBitmap } from '@/core/obd/discovery/pidBitmap';

describe('bitmapToPids', () => {
  it('reads the classic example reply BE 1F A8 13', () => {
    expect(bitmapToPids(0x00, [0xbe, 0x1f, 0xa8, 0x13])).toEqual([
      0x01, 0x03, 0x04, 0x05, 0x06, 0x07, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x13, 0x15, 0x1c, 0x1f, 0x20,
    ]);
  });

  it('offsets by the range base', () => {
    expect(bitmapToPids(0x20, [0x80, 0x00, 0x00, 0x01])).toEqual([0x21, 0x40]);
    expect(bitmapToPids(0x40, [0x00, 0x00, 0x00, 0x00])).toEqual([]);
  });

  it('handles the first and last bit, and all bits set', () => {
    expect(bitmapToPids(0, [0x80, 0, 0, 0])).toEqual([0x01]);
    expect(bitmapToPids(0, [0, 0, 0, 0x01])).toEqual([0x20]);
    expect(bitmapToPids(0, [0xff, 0xff, 0xff, 0xff])).toHaveLength(32);
  });
});

describe('extractBitmap', () => {
  it('reads a reply with or without spaces', () => {
    expect(extractBitmap(['41 00 BE 1F A8 13'], 0x00)).toEqual([0xbe, 0x1f, 0xa8, 0x13]);
    expect(extractBitmap(['4100BE1FA813'], 0x00)).toEqual([0xbe, 0x1f, 0xa8, 0x13]);
  });

  it('merges several control units: supported if any of them supports it', () => {
    expect(extractBitmap(['41 00 80 00 00 00', '41 00 00 00 00 01'], 0x00)).toEqual([0x80, 0x00, 0x00, 0x01]);
  });

  it('ignores replies for other PIDs, short replies and noise', () => {
    expect(extractBitmap(['41 20 80 00 00 00'], 0x00)).toBeNull();
    expect(extractBitmap(['41 00 80 00'], 0x00)).toBeNull();
    expect(extractBitmap(['NO DATA', 'garbage'], 0x00)).toBeNull();
  });
});

describe('pidStatus', () => {
  const caps: VehicleCapabilities = { discoveredAt: 1, supportedPids: [0x05, 0x21], highestRangeBase: 0x20, complete: true };
  it('separates supported, unsupported and unknown', () => {
    expect(pidStatus(caps, 0x05)).toBe('supported');
    expect(pidStatus(caps, 0x06)).toBe('unsupported'); // inside an answered range, bit was 0
    expect(pidStatus(caps, 0x40)).toBe('unsupported'); // last PID of the answered range 21-40
    expect(pidStatus(caps, 0x42)).toBe('unknown'); // never asked
  });
});
