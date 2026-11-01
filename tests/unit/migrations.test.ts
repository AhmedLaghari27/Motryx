import { MIGRATIONS, assertValidMigrations, runMigrations, type Migration } from '@/data/database/migrations';
import type { SqlDatabase } from '@/data/database/types';

/** Records every statement so we can assert order, without needing a SQL engine. */
function recordingDb(userVersion: number) {
  const log: string[] = [];
  const db: SqlDatabase = {
    exec: async (sql) => void log.push(sql.replace(/\s+/g, ' ').trim()),
    run: async () => ({ changes: 0 }),
    all: async <T>() => [] as T[],
    first: async <T>() => ({ user_version: userVersion }) as T,
    transaction: async <T>(fn: () => Promise<T>) => {
      log.push('BEGIN');
      const result = await fn();
      log.push('COMMIT');
      return result;
    },
  };
  return { db, log };
}

const m = (version: number): Migration => ({ version, name: `m${version}`, statements: [`STMT ${version}`] });

describe('migration list', () => {
  it('ships a valid, contiguous history', () => {
    expect(() => assertValidMigrations(MIGRATIONS)).not.toThrow();
  });
  it('rejects gaps, duplicates and empty migrations', () => {
    expect(() => assertValidMigrations([m(1), m(3)])).toThrow(/in order/);
    expect(() => assertValidMigrations([m(1), m(1)])).toThrow(/in order/);
    expect(() => assertValidMigrations([{ version: 1, name: 'x', statements: [] }])).toThrow(/no statements/);
  });
});

describe('runMigrations', () => {
  it('applies everything to a new database, each migration in its own transaction', async () => {
    const { db, log } = recordingDb(0);
    expect(await runMigrations(db, [m(1), m(2)])).toBe(2);
    expect(log).toEqual(['BEGIN', 'STMT 1', 'PRAGMA user_version = 1', 'COMMIT', 'BEGIN', 'STMT 2', 'PRAGMA user_version = 2', 'COMMIT']);
  });

  it('applies only what is pending after an app update', async () => {
    const { db, log } = recordingDb(1);
    await runMigrations(db, [m(1), m(2), m(3)]);
    expect(log.filter((l) => l.startsWith('STMT'))).toEqual(['STMT 2', 'STMT 3']);
  });

  it('does nothing when already current', async () => {
    const { db, log } = recordingDb(2);
    await runMigrations(db, [m(1), m(2)]);
    expect(log).toEqual([]);
  });

  it('refuses a database from a newer app version instead of damaging it', async () => {
    const { db } = recordingDb(5);
    await expect(runMigrations(db, [m(1), m(2)])).rejects.toThrow(/newer than this app/);
  });
});
