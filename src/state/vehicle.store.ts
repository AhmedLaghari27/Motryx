import { create } from 'zustand';
import { getDatabase } from '@/data/database/database';
import {
  createVehicle,
  deleteVehicle,
  getActiveVehicleId,
  listVehicles,
  setActiveVehicle,
  updateVehicle,
} from '@/data/repositories/vehicleRepository';
import type { Vehicle, VehicleFields } from '@/types/vehicle';
import { newId } from '@/utils/id';
import { uniqueNickname } from '@/utils/vehicle';

type Status = 'idle' | 'loading' | 'ready' | 'error';
export type ActionResult = { ok: true; vehicle: Vehicle } | { ok: false; message: string };

type VehicleStore = {
  status: Status;
  vehicles: Vehicle[];
  activeId: string | null;
  load: () => Promise<void>;
  add: (fields: VehicleFields) => Promise<ActionResult>;
  /** One-tap vehicle with no details, for people who just want to connect. */
  addUnknown: () => Promise<ActionResult>;
  update: (id: string, fields: VehicleFields) => Promise<ActionResult>;
  remove: (id: string) => Promise<{ ok: boolean }>;
  setActive: (id: string) => Promise<void>;
};

const SAVE_FAILED = 'Could not save the vehicle. Try again.';

export const useVehicleStore = create<VehicleStore>((set, get) => {
  const readAll = async () => {
    const db = await getDatabase();
    const [vehicles, activeId] = await Promise.all([listVehicles(db), getActiveVehicleId(db)]);
    set({ status: 'ready', vehicles, activeId });
  };

  return {
    status: 'idle',
    vehicles: [],
    activeId: null,

    load: async () => {
      if (get().status !== 'ready') set({ status: 'loading' });
      try {
        await readAll();
      } catch (error) {
        console.warn('Could not load the garage', error);
        set({ status: 'error' });
      }
    },

    add: async (fields) => {
      try {
        const db = await getDatabase();
        const vehicle = await createVehicle(db, fields, newId('veh'), Date.now());
        await readAll();
        return { ok: true, vehicle };
      } catch (error) {
        console.warn('Could not add vehicle', error);
        return { ok: false, message: SAVE_FAILED };
      }
    },

    addUnknown: async () => {
      const nickname = uniqueNickname('My car', get().vehicles.map((v) => v.nickname));
      return get().add({ nickname, make: null, model: null, year: null });
    },

    update: async (id, fields) => {
      try {
        const db = await getDatabase();
        const vehicle = await updateVehicle(db, id, fields, Date.now());
        if (!vehicle) return { ok: false, message: 'This vehicle no longer exists.' };
        await readAll();
        return { ok: true, vehicle };
      } catch (error) {
        console.warn('Could not update vehicle', error);
        return { ok: false, message: SAVE_FAILED };
      }
    },

    remove: async (id) => {
      try {
        const db = await getDatabase();
        await deleteVehicle(db, id);
        await readAll();
        return { ok: true };
      } catch (error) {
        console.warn('Could not delete vehicle', error);
        return { ok: false };
      }
    },

    setActive: async (id) => {
      try {
        const db = await getDatabase();
        if (await setActiveVehicle(db, id)) await readAll();
      } catch (error) {
        console.warn('Could not set active vehicle', error);
      }
    },
  };
});
