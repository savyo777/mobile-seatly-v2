import { getSupabase } from '@/lib/supabase/client';

/**
 * Persistence helpers for owner-side restaurant closures.
 *
 * Closures live under `restaurants.settings_json.closures` as an array — no
 * dedicated `restaurant_closures` table. The shape matches the on-screen
 * `Closure` row in `app/(staff)/closures.tsx`:
 *
 *   { date: 'YYYY-MM-DD'; reason?: string | null }
 *
 * The `id` field used by the local screen state is reconstructed on read; it
 * is not persisted because the (restaurant_id, date) pair is already unique.
 */
export type ClosureEntry = {
  date: string;
  reason?: string | null;
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function sanitize(entry: unknown): ClosureEntry | null {
  if (!entry || typeof entry !== 'object') return null;
  const e = entry as Record<string, unknown>;
  const date = typeof e.date === 'string' ? e.date.trim() : '';
  if (!ISO_DATE_RE.test(date)) return null;
  const rawReason =
    typeof e.reason === 'string'
      ? e.reason.trim()
      : null;
  return {
    date,
    reason: rawReason || null,
  };
}

function dedupe(entries: ClosureEntry[]): ClosureEntry[] {
  const seen = new Map<string, ClosureEntry>();
  for (const entry of entries) {
    seen.set(entry.date, entry);
  }
  return Array.from(seen.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Read the closures array from `restaurants.settings_json.closures`.
 * Returns `[]` when:
 *   - Supabase is not configured,
 *   - the restaurant row does not exist,
 *   - the settings_json key is missing or not an array.
 */
export async function readClosures(restaurantId: string): Promise<ClosureEntry[]> {
  if (!restaurantId) return [];
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('restaurants')
    .select('settings_json')
    .eq('id', restaurantId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return [];

  const settings =
    data.settings_json && typeof data.settings_json === 'object' && !Array.isArray(data.settings_json)
      ? (data.settings_json as Record<string, unknown>)
      : {};
  const raw = settings.closures;
  if (!Array.isArray(raw)) return [];
  const parsed = raw
    .map(sanitize)
    .filter((entry): entry is ClosureEntry => entry !== null);
  return dedupe(parsed);
}

/**
 * Write the closures array into `restaurants.settings_json.closures`. Merges
 * with the existing `settings_json` object so unrelated keys (price_range,
 * tags, ambiance, …) survive untouched.
 */
export async function writeClosures(
  restaurantId: string,
  closures: ClosureEntry[],
): Promise<void> {
  if (!restaurantId) return;
  const supabase = getSupabase();
  if (!supabase) return;

  const normalized = dedupe(
    closures
      .map(sanitize)
      .filter((entry): entry is ClosureEntry => entry !== null),
  );

  const { data: current, error: readErr } = await supabase
    .from('restaurants')
    .select('settings_json')
    .eq('id', restaurantId)
    .maybeSingle();
  if (readErr) throw readErr;

  const existing =
    current?.settings_json &&
    typeof current.settings_json === 'object' &&
    !Array.isArray(current.settings_json)
      ? (current.settings_json as Record<string, unknown>)
      : {};

  const nextSettings = { ...existing, closures: normalized };

  const { error: writeErr } = await supabase
    .from('restaurants')
    .update({ settings_json: nextSettings })
    .eq('id', restaurantId);
  if (writeErr) throw writeErr;
}
