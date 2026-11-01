import type { SqlDatabase } from './types';

export type Migration = { version: number; name: string; statements: string[] };

/**
 * Forward-only schema history. Never edit a shipped migration: add a new one.
 * The schema version is stored in SQLite's PRAGMA user_version.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'vehicles and settings',
    statements: [
      `CREATE TABLE vehicles (
         id         TEXT PRIMARY KEY NOT NULL,
         nickname   TEXT NOT NULL,
         make       TEXT,
         model      TEXT,
         year       INTEGER,
         created_at INTEGER NOT NULL,
         updated_at INTEGER NOT NULL
       )`,
      `CREATE TABLE settings (
         key   TEXT PRIMARY KEY NOT NULL,
         value TEXT NOT NULL
       )`,
    ],
  },
];

export function assertValidMigrations(migrations: readonly Migration[]): void {
  migrations.forEach((m, i) => {
    if (m.version !== i + 1) {
      throw new Error(`Migration versions must be 1, 2, 3... in order. Found ${m.version} at position ${i + 1}.`);
    }
    if (m.statements.length === 0) throw new Error(`Migration ${m.version} has no statements.`);
  });
}

/** Applies pending migrations, each in its own transaction. Returns the resulting schema version. */
export async function runMigrations(db: SqlDatabase, migrations: readonly Migration[] = MIGRATIONS): Promise<number> {
  assertValidMigrations(migrations);
  const latest = migrations.length;

  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  if (current > latest) {
    throw new Error(`Database version ${current} is newer than this app supports (${latest}). Update Motryx.`);
  }

  for (const migration of migrations.filter((m) => m.version > current)) {
    await db.transaction(async () => {
      for (const statement of migration.statements) await db.exec(statement);
      await db.exec(`PRAGMA user_version = ${migration.version}`);
    });
  }
  return latest;
}
