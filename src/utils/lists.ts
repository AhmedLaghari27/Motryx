/** Adds the id if missing, removes it if present. Returns a new list, order preserved. */
export function toggleId(list: readonly string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}
