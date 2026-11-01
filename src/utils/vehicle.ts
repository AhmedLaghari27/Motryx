import type { Vehicle, VehicleDraft, VehicleFields } from '@/types/vehicle';

export const NICKNAME_MAX = 40;
export const TEXT_MAX = 40;
export const YEAR_MIN = 1950;

export type VehicleErrors = Partial<Record<keyof VehicleDraft, string>>;
export type VehicleValidation = { ok: true; value: VehicleFields } | { ok: false; errors: VehicleErrors };

const tidy = (text: string) => text.replace(/\s+/g, ' ').trim();

/**
 * Validates the form text. Only the nickname is required: make, model and year may stay
 * empty, which is how an "unknown vehicle" is represented. Empty optional fields become null.
 */
export function validateVehicleDraft(draft: VehicleDraft, currentYear: number): VehicleValidation {
  const errors: VehicleErrors = {};

  const nickname = tidy(draft.nickname);
  if (nickname.length === 0) errors.nickname = 'Give your vehicle a name, like “Daily” or “Track car”.';
  else if (nickname.length > NICKNAME_MAX) errors.nickname = `Use ${NICKNAME_MAX} characters or fewer.`;

  const make = tidy(draft.make);
  if (make.length > TEXT_MAX) errors.make = `Use ${TEXT_MAX} characters or fewer.`;

  const model = tidy(draft.model);
  if (model.length > TEXT_MAX) errors.model = `Use ${TEXT_MAX} characters or fewer.`;

  let year: number | null = null;
  const yearText = draft.year.trim();
  if (yearText.length > 0) {
    const maxYear = currentYear + 1;
    if (!/^\d{4}$/.test(yearText)) {
      errors.year = 'Enter a four-digit year, like 2018.';
    } else {
      year = Number(yearText);
      if (year < YEAR_MIN || year > maxYear) {
        errors.year = `Enter a year between ${YEAR_MIN} and ${maxYear}.`;
        year = null;
      }
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { nickname, make: make || null, model: model || null, year } };
}

export function draftFromVehicle(vehicle?: Vehicle): VehicleDraft {
  return {
    nickname: vehicle?.nickname ?? '',
    make: vehicle?.make ?? '',
    model: vehicle?.model ?? '',
    year: vehicle?.year === null || vehicle?.year === undefined ? '' : String(vehicle.year),
  };
}

/** "2018 Toyota Corolla", or an honest placeholder when nothing is known. */
export function vehicleSubtitle(v: Pick<Vehicle, 'make' | 'model' | 'year'>): string {
  const parts = [v.year === null ? null : String(v.year), v.make, v.model].filter(
    (p): p is string => p !== null && p.length > 0,
  );
  return parts.length > 0 ? parts.join(' ') : 'Details not set';
}

/** "My car", then "My car 2", "My car 3"... so quick-added vehicles stay distinguishable. */
export function uniqueNickname(base: string, existing: readonly string[]): string {
  const taken = new Set(existing.map((n) => n.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`.toLowerCase())) n += 1;
  return `${base} ${n}`;
}
