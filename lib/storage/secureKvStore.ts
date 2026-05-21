/**
 * Tiny SecureStore-backed key/value helper for NON-Supabase-session
 * data (recovery timestamps, security flags, anything that should be
 * encrypted at rest but doesn't go through the Supabase storage
 * adapter).
 *
 * The Supabase session itself uses `secureStorageAdapter` from
 * `lib/supabase/secureStorage.ts` which has migration + size-cap logic
 * tailored to multi-KB session blobs. This wrapper is for small short
 * strings (timestamps, counters, single-purpose tokens).
 *
 * Falls back to AsyncStorage if `expo-secure-store` isn't linked, so
 * a stale dev client never crashes. The fallback is logged in __DEV__
 * so contributors notice.
 *
 * Added 2026-05-20 in the Phase B mobile hardening pass.
 */

import { requireNativeModule } from 'expo-modules-core';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NativeSecureStore = {
  getValueWithKeyAsync?: (key: string, options?: unknown) => Promise<string | null>;
  setValueWithKeyAsync?: (value: string, key: string, options?: unknown) => Promise<void>;
  deleteValueWithKeyAsync?: (key: string, options?: unknown) => Promise<void>;
};

type Maybe<T> = T | null;

let nativeCache: Maybe<NativeSecureStore> | undefined;

function loadNative(): Maybe<NativeSecureStore> {
  if (nativeCache !== undefined) return nativeCache;
  try {
    nativeCache = requireNativeModule('ExpoSecureStore') as NativeSecureStore;
  } catch {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[secureKvStore] ExpoSecureStore native module not linked — falling back to AsyncStorage. Run `npx expo install expo-secure-store && npx expo prebuild` to wire it.',
      );
    }
    nativeCache = null;
  }
  return nativeCache;
}

export async function secureGetString(key: string): Promise<string | null> {
  const native = loadNative();
  if (native?.getValueWithKeyAsync) {
    try {
      const v = await native.getValueWithKeyAsync(key);
      if (v != null) return v;
      // Migration: legacy plaintext entry may still be in AsyncStorage.
      const legacy = await AsyncStorage.getItem(key);
      if (legacy != null) {
        await native.setValueWithKeyAsync?.(legacy, key).catch(() => {});
        await AsyncStorage.removeItem(key).catch(() => {});
      }
      return legacy;
    } catch {
      // Keychain access errors → fall through to AsyncStorage.
    }
  }
  return AsyncStorage.getItem(key);
}

export async function secureSetString(key: string, value: string): Promise<void> {
  const native = loadNative();
  if (native?.setValueWithKeyAsync) {
    try {
      await native.setValueWithKeyAsync(value, key);
      // Belt + suspenders: scrub any legacy plaintext copy.
      await AsyncStorage.removeItem(key).catch(() => {});
      return;
    } catch {
      // Fall through to AsyncStorage so the caller's write isn't lost.
    }
  }
  await AsyncStorage.setItem(key, value);
}

export async function secureDeleteKey(key: string): Promise<void> {
  const native = loadNative();
  if (native?.deleteValueWithKeyAsync) {
    try {
      await native.deleteValueWithKeyAsync(key);
    } catch {
      // Best-effort.
    }
  }
  await AsyncStorage.removeItem(key).catch(() => {});
}
