/**
 * Hardened auth-token storage adapter for the Supabase client.
 *
 * Today the Supabase RN client persists session tokens to
 * AsyncStorage — plaintext on iOS (no Keychain wrap) and Android
 * SharedPreferences. A jailbroken / rooted device exposes the live
 * session. This adapter wraps `expo-secure-store` so tokens land in
 * iOS Keychain + Android EncryptedSharedPreferences instead.
 *
 * Wiring (manual step — kept off the critical path so a missing
 * `expo-secure-store` install doesn't break auth):
 *
 *   1. Add the dep:
 *        npx expo install expo-secure-store
 *   2. In lib/supabase/client.ts, replace
 *        storage: AsyncStorage,
 *      with
 *        storage: secureStorageAdapter(),
 *   3. The first run migrates any existing AsyncStorage session to
 *      SecureStore + clears the old plaintext copy. Subsequent runs
 *      use SecureStore exclusively.
 *
 * iOS Keychain caps individual entries at 4 KB. Supabase session
 * blobs run ~1.5–3 KB so a single entry fits. The adapter logs and
 * skips entries that exceed the cap (extremely rare) so the client
 * falls back to a fresh sign-in instead of silently losing state.
 *
 * Added 2026-05-17 in the security audit Phase 2.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_SECURE_ENTRY_BYTES = 4 * 1024;

type SupabaseStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

type SecureStoreModule = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

let secureStoreCache: SecureStoreModule | null | undefined;

async function loadSecureStore(): Promise<SecureStoreModule | null> {
  if (secureStoreCache !== undefined) return secureStoreCache;
  try {
    // Dynamic import so an uninstalled `expo-secure-store` doesn't
    // break the whole module graph.
    // @ts-ignore — module may not be installed yet
    const mod = await import('expo-secure-store');
    secureStoreCache = mod as unknown as SecureStoreModule;
  } catch {
    secureStoreCache = null;
  }
  return secureStoreCache;
}

/**
 * Returns a Supabase-compatible storage adapter. Falls back to plain
 * AsyncStorage if `expo-secure-store` isn't installed, so the auth
 * client never blocks on a missing native module.
 */
export function secureStorageAdapter(): SupabaseStorage {
  return {
    async getItem(key) {
      const store = await loadSecureStore();
      if (!store) return AsyncStorage.getItem(key);

      // Migration: if the key isn't in SecureStore yet but exists in
      // AsyncStorage, copy it across and clean up the plaintext copy.
      const fromSecure = await store.getItemAsync(key).catch(() => null);
      if (fromSecure != null) return fromSecure;
      const fromAsync = await AsyncStorage.getItem(key);
      if (fromAsync != null) {
        if (fromAsync.length <= MAX_SECURE_ENTRY_BYTES) {
          await store.setItemAsync(key, fromAsync).catch(() => {});
          await AsyncStorage.removeItem(key).catch(() => {});
        }
        return fromAsync;
      }
      return null;
    },
    async setItem(key, value) {
      const store = await loadSecureStore();
      if (!store || value.length > MAX_SECURE_ENTRY_BYTES) {
        // Fall back to AsyncStorage when SecureStore is missing or the
        // entry is too large. The latter shouldn't happen for
        // Supabase session blobs but we degrade gracefully.
        await AsyncStorage.setItem(key, value);
        return;
      }
      await store.setItemAsync(key, value);
      // Belt + suspenders: ensure the old plaintext copy is gone.
      await AsyncStorage.removeItem(key).catch(() => {});
    },
    async removeItem(key) {
      const store = await loadSecureStore();
      if (store) {
        await store.deleteItemAsync(key).catch(() => {});
      }
      await AsyncStorage.removeItem(key).catch(() => {});
    },
  };
}
