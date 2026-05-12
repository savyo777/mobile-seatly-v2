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

/**
 * Clears the persisted Supabase session from AsyncStorage AND resets the
 * client singleton. Use only when you need a completely fresh client (e.g.
 * after detecting a corrupt persisted session at startup). Do NOT call this
 * during a normal sign-out — it destroys the onAuthStateChange subscription
 * that AuthProvider registered on the original client, breaking subsequent logins.
 */
export async function clearPersistedSupabaseSession(): Promise<void> {
  const storageKey = getSupabaseAuthStorageKey();
  if (!storageKey) return;
  await AsyncStorage.multiRemove([
    storageKey,
    `${storageKey}-code-verifier`,
    `${storageKey}-user`,
  ]);
  client = null;
}

/**
 * Clears only the AsyncStorage keys for the Supabase session.
 * Unlike clearPersistedSupabaseSession, this does NOT null the client
 * singleton, so the onAuthStateChange subscription set up by AuthProvider
 * remains intact and subsequent logins work correctly.
 * Use this for normal sign-out flows.
 */
export async function clearSupabaseStorageOnly(): Promise<void> {
  const storageKey = getSupabaseAuthStorageKey();
  if (!storageKey) return;
  await AsyncStorage.multiRemove([
    storageKey,
    `${storageKey}-code-verifier`,
    `${storageKey}-user`,
  ]);
}

export async function clearUnusablePersistedSupabaseSession(): Promise<boolean> {
  const storageKey = getSupabaseAuthStorageKey();
  if (!storageKey) return false;
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw) as {
      access_token?: unknown;
      refresh_token?: unknown;
      expires_at?: unknown;
      currentSession?: {
        access_token?: unknown;
        refresh_token?: unknown;
        expires_at?: unknown;
      } | null;
    };
    const session = parsed.currentSession ?? parsed;
    const accessToken = typeof session.access_token === 'string' ? session.access_token.trim() : '';
    const refreshToken = typeof session.refresh_token === 'string' ? session.refresh_token.trim() : '';
    if (accessToken && refreshToken) return false;
  } catch {
    // Corrupt persisted auth JSON should not be handed to supabase-js.
  }

  await clearPersistedSupabaseSession();
  return true;
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
