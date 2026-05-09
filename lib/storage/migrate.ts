// One-shot storage migration. The product was renamed Seatly → Cenaiva,
// and several call sites used bare AsyncStorage keys (`claimed-promotions-v1`)
// or legacy `@seatly/...` keys before the namespacing helpers landed.
// On app start we copy any value we still recognize into the new
// `@cenaiva/...` namespace and drop the legacy entry.
//
// Failures are swallowed: persistence migration is best-effort and must
// never block app boot.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LEGACY_STORAGE_PREFIX, STORAGE_PREFIX, key } from '@/lib/storage/keys';

// Bare (un-namespaced) keys that older builds wrote directly. Each maps to
// the leaf name we now expose via `key(...)` — the prefix is added below.
const BARE_KEYS: ReadonlyArray<string> = [
  'claimed-promotions-v1',
  'customer-payment-methods-v1',
  'referral-limits-v1',
  'restaurant-billing-address-v1',
  'restaurant-payment-cards-v1',
];

let migrationRan = false;

export async function runStorageMigrations(): Promise<void> {
  if (migrationRan) return;
  migrationRan = true;

  try {
    const allKeys = await AsyncStorage.getAllKeys();

    for (const legacyKey of allKeys) {
      if (!legacyKey.startsWith(`${LEGACY_STORAGE_PREFIX}/`)) continue;
      const leaf = legacyKey.slice(LEGACY_STORAGE_PREFIX.length + 1);
      await copyKeyIfMissing(legacyKey, key(leaf));
    }

    for (const bareKey of BARE_KEYS) {
      if (!allKeys.includes(bareKey)) continue;
      await copyKeyIfMissing(bareKey, key(bareKey));
    }
  } catch {
    // Best-effort. Don't surface storage errors during boot.
  }
}

async function copyKeyIfMissing(legacyKey: string, newKey: string): Promise<void> {
  if (legacyKey === newKey) return;
  if (!newKey.startsWith(`${STORAGE_PREFIX}/`)) return;
  try {
    const [existing, legacyValue] = await Promise.all([
      AsyncStorage.getItem(newKey),
      AsyncStorage.getItem(legacyKey),
    ]);
    if (legacyValue == null) return;
    if (existing == null) {
      await AsyncStorage.setItem(newKey, legacyValue);
    }
    await AsyncStorage.removeItem(legacyKey);
  } catch {
    // Skip this key on error — we'll retry next launch.
  }
}
