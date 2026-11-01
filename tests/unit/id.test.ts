import { newId } from '@/utils/id';

describe('newId', () => {
  it('has a prefix and a compact body', () => {
    expect(newId('veh', 1_700_000_000_000, () => 0.5)).toMatch(/^veh_[0-9a-z]+$/);
  });
  it('does not collide across a large burst', () => {
    const ids = new Set(Array.from({ length: 5000 }, () => newId('veh')));
    expect(ids.size).toBe(5000);
  });
});
