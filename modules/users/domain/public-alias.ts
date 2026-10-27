export type PublicAliasRole = 'customer' | 'master';

/** Produces a stable, non-secret display alias without exposing a real name. */
export function createPublicAlias(role: PublicAliasRole, userId: string): string {
  let hash = 2_166_136_261;
  for (const char of userId) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }

  const number = 1_000 + (hash >>> 0) % 9_000;
  return `${role === 'master' ? 'Мастер' : 'Заказчик'} №${number}`;
}
