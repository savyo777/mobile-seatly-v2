// AsyncStorage key namespace. The product is Cenaiva, but earlier builds
// wrote storage either bare (`claimed-promotions-v1`) or under the legacy
// `@seatly/...` prefix. `lib/storage/migrate.ts` copies those values into
// the `@cenaiva/...` namespace on app start.

export const STORAGE_PREFIX = '@cenaiva';
export const LEGACY_STORAGE_PREFIX = '@seatly';

export function key(name: string): string {
  return `${STORAGE_PREFIX}/${name}`;
}

export function legacyKey(name: string): string {
  return `${LEGACY_STORAGE_PREFIX}/${name}`;
}
