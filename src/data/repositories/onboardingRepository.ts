import { z } from 'zod';
import type { KeyValueStorage } from '../kvStorage';

const KEY = 'motryx.onboarding.v1';
const schema = z.object({ version: z.literal(1), completedAt: z.number() });

/** Unreadable or invalid data counts as "not completed", so the worst case is seeing the intro again. */
export async function loadOnboardingDone(storage: KeyValueStorage): Promise<boolean> {
  try {
    const raw = await storage.getItem(KEY);
    if (!raw) return false;
    return schema.safeParse(JSON.parse(raw)).success;
  } catch {
    return false;
  }
}

export async function saveOnboardingDone(storage: KeyValueStorage, now: number = Date.now()): Promise<void> {
  await storage.setItem(KEY, JSON.stringify({ version: 1, completedAt: now }));
}

export async function clearOnboarding(storage: KeyValueStorage): Promise<void> {
  await storage.removeItem(KEY);
}
