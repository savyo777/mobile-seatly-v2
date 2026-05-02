import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv, isSupabaseConfigured } from './env';

let client: SupabaseClient | null = null;

export function getSupabaseAuthStorageKey(): string | null {
  if (!isSupabaseConfigured()) return null;
  const { url } = getSupabaseEnv();
  try {
    const projectRef = new URL(url).hostname.split('.')[0];
    if (!projectRef) return null;
    return `sb-${projectRef}-auth-token`;
  } catch {
    return null;
  }
}

export async function clearPersistedSupabaseSession(): Promise<void> {
  const storageKey = getSupabaseAuthStorageKey();
  if (!storageKey) return;
  await AsyncStorage.multiRemove([
    storageKey,
    `${storageKey}-code-verifier`,
    `${storageKey}-user`,
  ]);
}

/**
 * Singleton Supabase browser/RN client. Returns null when env is not set (mock-only mode).
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const { url, anonKey } = getSupabaseEnv();
  const storageKey = getSupabaseAuthStorageKey();
  if (!storageKey) return null;
  if (!client) {
    try {
      client = createClient(url, anonKey, {
        auth: {
          storage: AsyncStorage,
          storageKey,
          // Avoid Supabase's startup recovery logging stale refresh tokens to LogBox.
          // AuthProvider refreshes once, clears invalid persisted sessions, then starts
          // foreground auto-refresh only after a valid session exists.
          autoRefreshToken: false,
          persistSession: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
        },
      });
    } catch {
      return null;
    }
  }
  return client;
}
