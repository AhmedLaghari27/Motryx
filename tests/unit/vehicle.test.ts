import type { Vehicle, VehicleDraft } from '@/types/vehicle';
import { draftFromVehicle, uniqueNickname, validateVehicleDraft, vehicleSubtitle } from '@/utils/vehicle';

const draft = (over: Partial<VehicleDraft> = {}): VehicleDraft => ({
  nickname: 'Daily',
  make: '',
  model: '',
  year: '',
  ...over,
});

describe('validateVehicleDraft', () => {
  it('accepts a nickname alone, which is an unknown vehicle', () => {
    expect(validateVehicleDraft(draft(), 2026)).toEqual({
      ok: true,
      value: { nickname: 'Daily', make: null, model: null, year: null },
    });
  });

  it('requires a nickname', () => {
    const r = validateVehicleDraft(draft({ nickname: '   ' }), 2026);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.nickname).toMatch(/name/);
  });

  it('tidies whitespace and trims text', () => {
    const r = validateVehicleDraft(draft({ nickname: '  Track   car ', make: ' Toyota ', model: ' GR  86 ' }), 2026);
    expect(r).toMatchObject({ ok: true, value: { nickname: 'Track car', make: 'Toyota', model: 'GR 86' } });
  });

  it('limits text length', () => {
    const long = 'x'.repeat(41);
    const r = validateVehicleDraft(draft({ nickname: long, make: long, model: long }), 2026);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['make', 'model', 'nickname']);
  });

  it('parses a valid year', () => {
    expect(validateVehicleDraft(draft({ year: '2018' }), 2026)).toMatchObject({ ok: true, value: { year: 2018 } });
  });

  it('allows next model year but nothing later', () => {
    expect(validateVehicleDraft(draft({ year: '2027' }), 2026).ok).toBe(true);
    const r = validateVehicleDraft(draft({ year: '2028' }), 2026);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.year).toMatch(/1950 and 2027/);
  });

  it('rejects years that are too old or not four digits', () => {
    for (const year of ['1949', '18', '20188', '20x8', '2,018']) {
      const r = validateVehicleDraft(draft({ year }), 2026);
      expect(r.ok).toBe(false);
    }
  });
});

describe('vehicle display', () => {
  const base = { make: null, model: null, year: null };
  it('joins what is known', () => {
    expect(vehicleSubtitle({ make: 'Toyota', model: 'Corolla', year: 2018 })).toBe('2018 Toyota Corolla');
    expect(vehicleSubtitle({ ...base, make: 'Toyota' })).toBe('Toyota');
    expect(vehicleSubtitle({ ...base, year: 2018 })).toBe('2018');
  });
  it('is honest when nothing is known', () => {
    expect(vehicleSubtitle(base)).toBe('Details not set');
  });
  it('builds a draft for editing', () => {
    const v: Vehicle = { id: 'a', nickname: 'Daily', make: null, model: 'Corolla', year: 2018, createdAt: 1, updatedAt: 1 };
    expect(draftFromVehicle(v)).toEqual({ nickname: 'Daily', make: '', model: 'Corolla', year: '2018' });
    expect(draftFromVehicle(undefined)).toEqual({ nickname: '', make: '', model: '', year: '' });
  });
});

describe('uniqueNickname', () => {
  it('keeps the base when free and numbers it otherwise', () => {
    expect(uniqueNickname('My car', [])).toBe('My car');
    expect(uniqueNickname('My car', ['My car'])).toBe('My car 2');
    expect(uniqueNickname('My car', ['my car', 'My car 2'])).toBe('My car 3');
  });
});
