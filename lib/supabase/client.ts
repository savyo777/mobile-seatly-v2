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

function decodeJwtPayload(token: string): { exp?: number } | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return JSON.parse(atob(padded)) as { exp?: number };
  } catch {
    return null;
  }
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
    const expiresAt =
      typeof parsed.expires_at === 'number'
        ? parsed.expires_at
        : typeof session.expires_at === 'number'
          ? session.expires_at
          : decodeJwtPayload(accessToken)?.exp ?? null;
    const expired = typeof expiresAt === 'number' && expiresAt <= Math.floor(Date.now() / 1000);
    if (accessToken && refreshToken && !expired) return false;
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
