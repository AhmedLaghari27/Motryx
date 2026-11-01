import { ResponseFramer } from '@/core/obd/adapter/framing';
import { classifyResponse, hexToBytes, normalizeLines } from '@/core/obd/adapter/responses';

describe('ResponseFramer', () => {
  it('waits for the prompt before returning a reply', () => {
    const f = new ResponseFramer();
    expect(f.push('41 0C 1A')).toEqual([]);
    expect(f.push(' F8 \r\r')).toEqual([]);
    expect(f.push('>')).toEqual(['41 0C 1A F8 \r\r']);
  });

  it('copes with a link that delivers one character at a time', () => {
    const f = new ResponseFramer();
    const out = 'OK\r\r>'.split('').flatMap((c) => f.push(c));
    expect(out).toEqual(['OK\r\r']);
  });

  it('splits several replies that arrive together', () => {
    expect(new ResponseFramer().push('OK\r>41 05 7B\r>')).toEqual(['OK\r', '41 05 7B\r']);
  });

  it('keeps a half reply for the next chunk, and can be reset', () => {
    const f = new ResponseFramer();
    f.push('41 0C');
    f.reset();
    expect(f.push('OK>')).toEqual(['OK']);
  });

  it('does not grow forever on garbage', () => {
    const f = new ResponseFramer();
    f.push('x'.repeat(9000));
    expect(f.push('OK>')).toEqual(['OK']);
  });
});

describe('normalizeLines', () => {
  it('drops echo, searching noise and blank lines', () => {
    expect(normalizeLines('010C\rSEARCHING...\r41 0C 1A F8 \r\r', '010C')).toEqual(['41 0C 1A F8']);
    expect(normalizeLines('01 0c\r41 0C 00 00', '010C')).toEqual(['41 0C 00 00']);
  });
});

describe('classifyResponse', () => {
  it('returns clean data as ok', () => {
    expect(classifyResponse('41 0C 1A F8 \r\r', '010C')).toEqual({ ok: true, lines: ['41 0C 1A F8'] });
  });

  it.each([
    ['UNABLE TO CONNECT', 'UNABLE_TO_CONNECT'],
    ['SEARCHING...\rUNABLE TO CONNECT', 'UNABLE_TO_CONNECT'],
    ['NO DATA', 'NO_DATA'],
    ['BUS INIT: ...ERROR', 'BUS_ERROR'],
    ['CAN ERROR', 'BUS_ERROR'],
    ['ERR94', 'BUS_ERROR'],
    ['BUFFER FULL', 'BUFFER_FULL'],
    ['STOPPED', 'STOPPED'],
    ['?', 'UNKNOWN_COMMAND'],
    ['no data', 'NO_DATA'],
  ])('maps %p to %s', (raw, error) => {
    const r = classifyResponse(raw, '0100');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe(error);
  });
});

describe('hexToBytes', () => {
  it('parses clean hex with or without spaces', () => {
    expect(hexToBytes('41 0C 1A F8')).toEqual([0x41, 0x0c, 0x1a, 0xf8]);
    expect(hexToBytes('410C1AF8')).toEqual([0x41, 0x0c, 0x1a, 0xf8]);
  });
  it('refuses anything that is not clean hex', () => {
    for (const bad of ['', '4', '41 0G', 'NO DATA']) expect(hexToBytes(bad)).toBeNull();
  });
});
