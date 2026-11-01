export type Vehicle = {
  id: string;
  nickname: string;
  make: string | null;
  model: string | null;
  year: number | null;
  createdAt: number;
  updatedAt: number;
};

/** The editable fields, already validated and normalized. */
export type VehicleFields = {
  nickname: string;
  make: string | null;
  model: string | null;
  year: number | null;
};

/** Raw text as typed in the form. */
export type VehicleDraft = {
  nickname: string;
  make: string;
  model: string;
  year: string;
};
