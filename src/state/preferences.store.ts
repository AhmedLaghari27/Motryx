import { create } from 'zustand';
import { kvStorage } from '@/data/kvStorage';
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  type Preferences,
} from '@/data/repositories/preferencesRepository';
import { toggleId } from '@/utils/lists';
import type { UnitSystem } from '@/utils/units';

type PreferencesStore = {
  status: 'loading' | 'ready';
  prefs: Preferences;
  hydrate: () => Promise<void>;
  setUnitSystem: (system: UnitSystem) => void;
  toggleFavorite: (sensorId: string) => void;
  /** Adds or removes a sensor on the cockpit dashboard. */
  toggleDashboard: (sensorId: string) => void;
};

export const usePreferencesStore = create<PreferencesStore>((set, get) => {
  const update = (change: Partial<Omit<Preferences, 'version'>>) => {
    const next = { ...get().prefs, ...change };
    set({ prefs: next });
    savePreferences(kvStorage, next).catch((error) => console.warn('Could not save preferences', error));
  };

  return {
    status: 'loading',
    prefs: DEFAULT_PREFERENCES,
    hydrate: async () => {
      set({ prefs: await loadPreferences(kvStorage), status: 'ready' });
    },
    setUnitSystem: (unitSystem) => update({ unitSystem }),
    toggleFavorite: (id) => update({ favorites: toggleId(get().prefs.favorites, id) }),
    toggleDashboard: (id) => update({ dashboard: toggleId(get().prefs.dashboard, id) }),
  };
});
