import { z } from 'zod';
import type { KeyValueStorage } from '../kvStorage';

const KEY = 'motryx.prefs.v1';

const schema = z.object({
  version: z.literal(1),
  unitSystem: z.enum(['metric', 'imperial']),
  favorites: z.array(z.string()),
  dashboard: z.array(z.string()),
});

export type Preferences = z.infer<typeof schema>;

export const DEFAULT_PREFERENCES: Preferences = { version: 1, unitSystem: 'metric', favorites: [], dashboard: [] };

/** Missing, unreadable or invalid data gives the defaults, never a crash. */
export async function loadPreferences(storage: KeyValueStorage): Promise<Preferences> {
  try {
    const raw = await storage.getItem(KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferences(storage: KeyValueStorage, prefs: Preferences): Promise<void> {
  await storage.setItem(KEY, JSON.stringify(prefs));
}
