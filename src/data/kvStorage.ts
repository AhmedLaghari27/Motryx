import Storage from 'expo-sqlite/kv-store';

/** Minimal async key-value contract so repositories can be tested with an in-memory fake. */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const kvStorage: KeyValueStorage = Storage;
