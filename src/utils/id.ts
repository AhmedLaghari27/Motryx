/** Short unique id without a crypto dependency: prefix + time + random. Collisions are negligible per device. */
export function newId(prefix: string, now: number = Date.now(), random: () => number = Math.random): string {
  const rand = Math.floor(random() * 36 ** 6)
    .toString(36)
    .padStart(6, '0');
  return `${prefix}_${now.toString(36)}${rand}`;
}
