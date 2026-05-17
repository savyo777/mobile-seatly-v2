import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv, isSupabaseConfigured } from './env';
import { secureStorageAdapter } from './secureStorage';

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
 * Clears the persisted Supabase session and resets the client singleton.
 * Use only when you need a completely fresh client (e.g. after detecting
 * a corrupt persisted session at startup). Do NOT call this during a
 * normal sign-out — it destroys the onAuthStateChange subscription that
 * AuthProvider registered on the original client, breaking subsequent
 * logins.
 *
 * Clears from BOTH SecureStore and AsyncStorage so the migration period
 * (some users may still have AsyncStorage leftovers) is handled.
 */
export async function clearPersistedSupabaseSession(): Promise<void> {
  const storageKey = getSupabaseAuthStorageKey();
  if (!storageKey) return;
  const adapter = secureStorageAdapter();
  const keys = [storageKey, `${storageKey}-code-verifier`, `${storageKey}-user`];
  await Promise.all(keys.map((k) => adapter.removeItem(k).catch(() => {})));
  client = null;
}

/**
 * Clears only the persisted Supabase session keys. Unlike
 * clearPersistedSupabaseSession, this does NOT null the client
 * singleton, so the onAuthStateChange subscription set up by
 * AuthProvider remains intact and subsequent logins work correctly.
 * Use this for normal sign-out flows.
 *
 * Clears from BOTH SecureStore and AsyncStorage to cover both new
 * sessions and lingering AsyncStorage ones from before the migration.
 */
export async function clearSupabaseStorageOnly(): Promise<void> {
  const storageKey = getSupabaseAuthStorageKey();
  if (!storageKey) return;
  const adapter = secureStorageAdapter();
  const keys = [storageKey, `${storageKey}-code-verifier`, `${storageKey}-user`];
  await Promise.all(keys.map((k) => adapter.removeItem(k).catch(() => {})));
}

export async function clearUnusablePersistedSupabaseSession(): Promise<boolean> {
  const storageKey = getSupabaseAuthStorageKey();
  if (!storageKey) return false;
  // Read via the adapter so we see the session regardless of whether it
  // lives in SecureStore (new) or AsyncStorage (pre-migration leftover).
  const raw = await secureStorageAdapter().getItem(storageKey);
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
 *
 * Session tokens are persisted via `secureStorageAdapter()` which
 * wraps `expo-secure-store` — tokens land in iOS Keychain + Android
 * EncryptedSharedPreferences instead of plaintext AsyncStorage. The
 * adapter handles a one-time migration on first read so existing
 * sessions are moved over without a logout-everyone event. Closed
 * the P1 finding in the 2026-05-17 security audit.
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
          storage: secureStorageAdapter(),
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
