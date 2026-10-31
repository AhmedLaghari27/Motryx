import type { KeyValueStorage } from '@/data/kvStorage';
import { clearOnboarding, loadOnboardingDone, saveOnboardingDone } from '@/data/repositories/onboardingRepository';

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  };
}

describe('onboarding repository', () => {
  it('starts as not completed', async () => {
    expect(await loadOnboardingDone(memoryStorage())).toBe(false);
  });

  it('remembers completion', async () => {
    const storage = memoryStorage();
    await saveOnboardingDone(storage, 1234);
    expect(await loadOnboardingDone(storage)).toBe(true);
  });

  it('can be cleared to replay the intro', async () => {
    const storage = memoryStorage();
    await saveOnboardingDone(storage);
    await clearOnboarding(storage);
    expect(await loadOnboardingDone(storage)).toBe(false);
  });

  it('treats corrupt or unexpected data as not completed', async () => {
    const key = 'motryx.onboarding.v1';
    expect(await loadOnboardingDone(memoryStorage({ [key]: '{not json' }))).toBe(false);
    expect(await loadOnboardingDone(memoryStorage({ [key]: '{"version":2,"completedAt":1}' }))).toBe(false);
    expect(await loadOnboardingDone(memoryStorage({ [key]: '{"version":1}' }))).toBe(false);
  });

  it('treats a failing storage as not completed instead of crashing', async () => {
    const broken: KeyValueStorage = {
      getItem: async () => {
        throw new Error('disk error');
      },
      setItem: async () => undefined,
      removeItem: async () => undefined,
    };
    expect(await loadOnboardingDone(broken)).toBe(false);
  });
});
