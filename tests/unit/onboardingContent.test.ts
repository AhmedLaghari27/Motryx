import { ONBOARDING_PAGES } from '@/features/onboarding/onboardingContent';

describe('onboarding content', () => {
  it('has three unique pages, ending on safety', () => {
    const ids = ONBOARDING_PAGES.map((p) => p.id);
    expect(ids).toEqual(['welcome', 'adapter', 'safety']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every page a title, body and points', () => {
    for (const page of ONBOARDING_PAGES) {
      expect(page.title.length).toBeGreaterThan(0);
      expect(page.body.length).toBeGreaterThan(0);
      expect(page.points.length).toBeGreaterThan(0);
    }
  });

  it('keeps the closed-course safety message and the honest-data promise', () => {
    const all = ONBOARDING_PAGES.flatMap((p) => p.points.map((x) => x.text)).join(' ');
    expect(all).toMatch(/closed course/);
    expect(all).toMatch(/never use your phone while driving/i);
    expect(all).toMatch(/Nothing is guessed/);
  });
});
