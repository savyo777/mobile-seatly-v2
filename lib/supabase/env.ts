/**
 * Supabase project URL and anon key from Expo public env.
 * Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in `.env` (see `.env.example`).
 */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  return {
    url: (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim(),
    anonKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim(),
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) return false;
  if (url.includes('<') || url.includes('>') || anonKey.includes('<') || anonKey.includes('>')) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}
