import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';
import type { SqlDatabase } from './types';

function wrap(db: SQLite.SQLiteDatabase): SqlDatabase {
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params = []) => {
      const result = await db.runAsync(sql, params);
      return { changes: result.changes };
    },
    all: <T>(sql: string, params: (string | number | null)[] = []) => db.getAllAsync<T>(sql, params),
    first: <T>(sql: string, params: (string | number | null)[] = []) => db.getFirstAsync<T>(sql, params),
    // Single user, single connection, and the app serializes its own writes, so a plain transaction is enough.
    transaction: async <T>(fn: () => Promise<T>) => {
      let result!: T;
      await db.withTransactionAsync(async () => {
        result = await fn();
      });
      return result;
    },
  };
}

let opening: Promise<SqlDatabase> | null = null;

/** Opens the app database once, applies migrations, and shares the connection. */
export function getDatabase(): Promise<SqlDatabase> {
  if (!opening) {
    opening = (async () => {
      const raw = await SQLite.openDatabaseAsync('motryx.db');
      await raw.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      const db = wrap(raw);
      await runMigrations(db);
      return db;
    })();
    // Allow a retry after a failure instead of caching the rejection forever.
    opening.catch(() => {
      opening = null;
    });
  }
  return opening;
}
