// AsyncStorage key namespace. The product is Cenaiva, but most storage keys
// were originally written under `@seatly/...` and are migrated by
// `lib/storage/migrate.ts` to `@cenaiva/...` on app start.

export const STORAGE_PREFIX = '@cenaiva';
export const LEGACY_STORAGE_PREFIX = '@seatly';

export function key(name: string): string {
  return `${STORAGE_PREFIX}/${name}`;
}

export function legacyKey(name: string): string {
  return `${LEGACY_STORAGE_PREFIX}/${name}`;
}
