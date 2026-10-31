import { create } from 'zustand';
import { kvStorage } from '@/data/kvStorage';
import { clearOnboarding, loadOnboardingDone, saveOnboardingDone } from '@/data/repositories/onboardingRepository';

export type OnboardingStatus = 'loading' | 'needed' | 'done';

type OnboardingStore = {
  status: OnboardingStatus;
  hydrate: () => Promise<void>;
  complete: () => Promise<void>;
  /** Replay the welcome and safety pages (Settings → About). */
  reopen: () => Promise<void>;
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  status: 'loading',
  hydrate: async () => {
    const done = await loadOnboardingDone(kvStorage);
    set({ status: done ? 'done' : 'needed' });
  },
  complete: async () => {
    set({ status: 'done' }); // respond immediately; saving can lag
    try {
      await saveOnboardingDone(kvStorage);
    } catch (error) {
      console.warn('Could not save onboarding state', error);
    }
  },
  reopen: async () => {
    set({ status: 'needed' });
    try {
      await clearOnboarding(kvStorage);
    } catch (error) {
      console.warn('Could not clear onboarding state', error);
    }
  },
}));
