import type { Vehicle, VehicleFields } from '@/types/vehicle';
import type { SqlDatabase } from '../database/types';

const ACTIVE_KEY = 'active_vehicle_id';

type Row = {
  id: string;
  nickname: string;
  make: string | null;
  model: string | null;
  year: number | null;
  created_at: number;
  updated_at: number;
};

const COLUMNS = 'id, nickname, make, model, year, created_at, updated_at';

const toVehicle = (r: Row): Vehicle => ({
  id: r.id,
  nickname: r.nickname,
  make: r.make,
  model: r.model,
  year: r.year,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export async function listVehicles(db: SqlDatabase): Promise<Vehicle[]> {
  const rows = await db.all<Row>(`SELECT ${COLUMNS} FROM vehicles ORDER BY created_at ASC, id ASC`);
  return rows.map(toVehicle);
}

export async function getVehicle(db: SqlDatabase, id: string): Promise<Vehicle | null> {
  const row = await db.first<Row>(`SELECT ${COLUMNS} FROM vehicles WHERE id = ?`, [id]);
  return row ? toVehicle(row) : null;
}

/** The active vehicle id, ignoring a stale setting that points at a deleted vehicle. */
export async function getActiveVehicleId(db: SqlDatabase): Promise<string | null> {
  const row = await db.first<{ id: string }>(
    'SELECT v.id AS id FROM vehicles v JOIN settings s ON s.key = ? AND s.value = v.id',
    [ACTIVE_KEY],
  );
  return row?.id ?? null;
}

async function writeActive(db: SqlDatabase, id: string): Promise<void> {
  await db.run(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [ACTIVE_KEY, id],
  );
}

/** Keeps exactly one valid active vehicle whenever any vehicle exists. */
async function ensureActive(db: SqlDatabase): Promise<void> {
  if (await getActiveVehicleId(db)) return;
  const first = await db.first<{ id: string }>('SELECT id FROM vehicles ORDER BY created_at ASC, id ASC LIMIT 1');
  if (first) await writeActive(db, first.id);
  else await db.run('DELETE FROM settings WHERE key = ?', [ACTIVE_KEY]);
}

export async function createVehicle(db: SqlDatabase, fields: VehicleFields, id: string, now: number): Promise<Vehicle> {
  await db.transaction(async () => {
    await db.run(
      'INSERT INTO vehicles (id, nickname, make, model, year, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, fields.nickname, fields.make, fields.model, fields.year, now, now],
    );
    await ensureActive(db); // the first vehicle becomes active automatically
  });
  return { id, ...fields, createdAt: now, updatedAt: now };
}

/** Returns the updated vehicle, or null if it no longer exists. */
export async function updateVehicle(
  db: SqlDatabase,
  id: string,
  fields: VehicleFields,
  now: number,
): Promise<Vehicle | null> {
  const { changes } = await db.run(
    'UPDATE vehicles SET nickname = ?, make = ?, model = ?, year = ?, updated_at = ? WHERE id = ?',
    [fields.nickname, fields.make, fields.model, fields.year, now, id],
  );
  return changes > 0 ? getVehicle(db, id) : null;
}

export async function deleteVehicle(db: SqlDatabase, id: string): Promise<void> {
  await db.transaction(async () => {
    await db.run('DELETE FROM vehicles WHERE id = ?', [id]);
    await ensureActive(db); // hands "active" to the next vehicle if the active one was deleted
  });
}

/** Returns false if the vehicle does not exist. */
export async function setActiveVehicle(db: SqlDatabase, id: string): Promise<boolean> {
  const exists = await db.first<{ id: string }>('SELECT id FROM vehicles WHERE id = ?', [id]);
  if (!exists) return false;
  await writeActive(db, id);
  return true;
}
