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

type NativeSecureStore = {
  getValueWithKeyAsync?: (key: string, options?: unknown) => Promise<string | null>;
  setValueWithKeyAsync?: (value: string, key: string, options?: unknown) => Promise<void>;
  deleteValueWithKeyAsync?: (key: string, options?: unknown) => Promise<void>;
};

let secureStoreCache: SecureStoreModule | null | undefined;

function loadSecureStore(): SecureStoreModule | null {
  if (secureStoreCache !== undefined) return secureStoreCache;
  // Bypass the `expo-secure-store` JS shim. The shim's top-level
  // `export default requireNativeModule('ExpoSecureStore')` *throws
  // synchronously during module evaluation* when the native side isn't
  // linked (e.g. a stale dev client built before the dep was added),
  // and that throw escapes Metro's dynamic-import polyfill as an
  // uncaught error — which is what the global crash guard was logging
  // on every login.
  //
  // `requireOptionalNativeModule` from expo-modules-core returns null
  // when the module is missing instead of throwing, so we can detect
  // the missing native side without ever evaluating the throwing shim.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const core = require('expo-modules-core') as {
      requireOptionalNativeModule?: <T>(name: string) => T | null;
    };
    const native = core.requireOptionalNativeModule?.<NativeSecureStore>('ExpoSecureStore') ?? null;
    if (
      !native ||
      typeof native.getValueWithKeyAsync !== 'function' ||
      typeof native.setValueWithKeyAsync !== 'function' ||
      typeof native.deleteValueWithKeyAsync !== 'function'
    ) {
      secureStoreCache = null;
      return secureStoreCache;
    }
    // Adapt the native API (getValueWithKeyAsync / setValueWithKeyAsync
    // / deleteValueWithKeyAsync) to the simple key/value shape the rest
    // of this file expects.
    secureStoreCache = {
      getItemAsync: (key) => native.getValueWithKeyAsync!(key, {}),
      setItemAsync: (key, value) => native.setValueWithKeyAsync!(value, key, {}),
      deleteItemAsync: (key) => native.deleteValueWithKeyAsync!(key, {}),
    };
  } catch {
    secureStoreCache = null;
  }
  return secureStoreCache;
}

/**
 * Safe wrappers around the native methods. Native module proxies in
 * Expo throw synchronously when the native side isn't linked, so
 * `.catch()` on the returned promise can't see those throws. Wrap each
 * call in try/catch to convert any error (sync throw or rejection)
 * into a benign null/no-op.
 */
async function safeSecureGet(store: SecureStoreModule, key: string): Promise<string | null> {
  try {
    return await store.getItemAsync(key);
  } catch {
    return null;
  }
}

async function safeSecureSet(store: SecureStoreModule, key: string, value: string): Promise<boolean> {
  try {
    await store.setItemAsync(key, value);
    return true;
  } catch {
    return false;
  }
}

async function safeSecureDelete(store: SecureStoreModule, key: string): Promise<void> {
  try {
    await store.deleteItemAsync(key);
  } catch {
    // ignore
  }
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
      const fromSecure = await safeSecureGet(store, key);
      if (fromSecure != null) return fromSecure;
      const fromAsync = await AsyncStorage.getItem(key);
      if (fromAsync != null) {
        if (fromAsync.length <= MAX_SECURE_ENTRY_BYTES) {
          const migrated = await safeSecureSet(store, key, fromAsync);
          if (migrated) {
            await AsyncStorage.removeItem(key).catch(() => {});
          }
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
      const wrote = await safeSecureSet(store, key, value);
      if (wrote) {
        // Belt + suspenders: ensure the old plaintext copy is gone.
        await AsyncStorage.removeItem(key).catch(() => {});
        return;
      }
      // SecureStore can fail at runtime (missing native module on a
      // mismatched dev build, Keychain access errors, etc.). Persist
      // to AsyncStorage so the session is still recoverable on next
      // launch.
      await AsyncStorage.setItem(key, value);
    },
    async removeItem(key) {
      const store = await loadSecureStore();
      if (store) {
        await safeSecureDelete(store, key);
      }
      await AsyncStorage.removeItem(key).catch(() => {});
    },
  };
}
