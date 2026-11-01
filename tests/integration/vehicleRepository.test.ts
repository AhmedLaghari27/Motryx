/**
 * Runs the real migrations and repository SQL against an in-memory SQLite (sql.js),
 * so schema and query mistakes are caught without a phone.
 */
import initSqlJs from 'sql.js';
import { runMigrations } from '@/data/database/migrations';
import type { SqlDatabase, SqlParam } from '@/data/database/types';
import {
  createVehicle,
  deleteVehicle,
  getActiveVehicleId,
  getVehicle,
  listVehicles,
  setActiveVehicle,
  updateVehicle,
} from '@/data/repositories/vehicleRepository';
import type { VehicleFields } from '@/types/vehicle';

async function createTestDb(): Promise<SqlDatabase> {
  const SQL = await initSqlJs();
  const raw = new SQL.Database();

  const query = <T>(sql: string, params: SqlParam[]): T[] => {
    const stmt = raw.prepare(sql);
    stmt.bind(params);
    const rows: T[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as T);
    stmt.free();
    return rows;
  };

  return {
    exec: async (sql) => {
      raw.exec(sql);
    },
    run: async (sql, params = []) => {
      raw.run(sql, params);
      return { changes: raw.getRowsModified() };
    },
    all: async <T>(sql: string, params: SqlParam[] = []) => query<T>(sql, params),
    first: async <T>(sql: string, params: SqlParam[] = []) => query<T>(sql, params)[0] ?? null,
    transaction: async <T>(fn: () => Promise<T>) => {
      raw.exec('BEGIN');
      try {
        const result = await fn();
        raw.exec('COMMIT');
        return result;
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

const fields = (nickname: string, over: Partial<VehicleFields> = {}): VehicleFields => ({
  nickname,
  make: null,
  model: null,
  year: null,
  ...over,
});

describe('vehicle repository (real SQL)', () => {
  let db: SqlDatabase;
  beforeEach(async () => {
    db = await createTestDb();
    await runMigrations(db);
  });

  it('migrates a new database to the latest version and is safe to run again', async () => {
    expect((await db.first<{ user_version: number }>('PRAGMA user_version'))?.user_version).toBe(1);
    await expect(runMigrations(db)).resolves.toBe(1);
  });

  it('starts empty with no active vehicle', async () => {
    expect(await listVehicles(db)).toEqual([]);
    expect(await getActiveVehicleId(db)).toBeNull();
  });

  it('saves and reads back a vehicle, keeping unknown details as null', async () => {
    await createVehicle(db, fields('Daily'), 'v1', 1000);
    expect(await getVehicle(db, 'v1')).toEqual({
      id: 'v1', nickname: 'Daily', make: null, model: null, year: null, createdAt: 1000, updatedAt: 1000,
    });
  });

  it('makes the first vehicle active and leaves it when adding more', async () => {
    await createVehicle(db, fields('A'), 'a', 1);
    await createVehicle(db, fields('B'), 'b', 2);
    expect(await getActiveVehicleId(db)).toBe('a');
    expect((await listVehicles(db)).map((v) => v.id)).toEqual(['a', 'b']);
  });

  it('switches the active vehicle, but not to one that does not exist', async () => {
    await createVehicle(db, fields('A'), 'a', 1);
    await createVehicle(db, fields('B'), 'b', 2);
    expect(await setActiveVehicle(db, 'b')).toBe(true);
    expect(await getActiveVehicleId(db)).toBe('b');
    expect(await setActiveVehicle(db, 'nope')).toBe(false);
    expect(await getActiveVehicleId(db)).toBe('b');
  });

  it('updates details and bumps updatedAt only', async () => {
    await createVehicle(db, fields('Daily'), 'v1', 1000);
    const updated = await updateVehicle(db, 'v1', fields('Daily', { make: 'Toyota', year: 2018 }), 2000);
    expect(updated).toMatchObject({ make: 'Toyota', year: 2018, createdAt: 1000, updatedAt: 2000 });
  });

  it('returns null when updating a missing vehicle', async () => {
    expect(await updateVehicle(db, 'ghost', fields('x'), 1)).toBeNull();
  });

  it('hands "active" to the next vehicle when the active one is deleted', async () => {
    await createVehicle(db, fields('A'), 'a', 1);
    await createVehicle(db, fields('B'), 'b', 2);
    await deleteVehicle(db, 'a');
    expect(await getActiveVehicleId(db)).toBe('b');
  });

  it('keeps the active vehicle when a different one is deleted', async () => {
    await createVehicle(db, fields('A'), 'a', 1);
    await createVehicle(db, fields('B'), 'b', 2);
    await deleteVehicle(db, 'b');
    expect(await getActiveVehicleId(db)).toBe('a');
  });

  it('clears the active setting when the last vehicle is deleted', async () => {
    await createVehicle(db, fields('A'), 'a', 1);
    await deleteVehicle(db, 'a');
    expect(await listVehicles(db)).toEqual([]);
    expect(await getActiveVehicleId(db)).toBeNull();
    // a vehicle added afterwards becomes active again
    await createVehicle(db, fields('B'), 'b', 3);
    expect(await getActiveVehicleId(db)).toBe('b');
  });

  it('rolls back a failed create instead of leaving a half-saved vehicle', async () => {
    await createVehicle(db, fields('A'), 'dup', 1);
    await expect(createVehicle(db, fields('B'), 'dup', 2)).rejects.toThrow();
    expect((await listVehicles(db)).map((v) => v.nickname)).toEqual(['A']);
  });

  it('stores text safely, including quotes and unicode', async () => {
    const nickname = `Dad's "truck" ✓`;
    await createVehicle(db, fields(nickname, { make: "O'Brien" }), 'v1', 1);
    expect(await getVehicle(db, 'v1')).toMatchObject({ nickname, make: "O'Brien" });
  });
});
