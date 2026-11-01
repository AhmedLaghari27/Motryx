export type SqlParam = string | number | null;

/** The small SQL surface the app needs. The real driver and test fakes both implement it. */
export interface SqlDatabase {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParam[]): Promise<{ changes: number }>;
  all<T>(sql: string, params?: SqlParam[]): Promise<T[]>;
  first<T>(sql: string, params?: SqlParam[]): Promise<T | null>;
  /** Runs fn atomically: commits if it resolves, rolls back if it throws. */
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}
