/**
 * Build 3b — client wrapper for the `export-my-data` edge function.
 * Implements ToS §18 PIPEDA / Quebec Law 25 data portability right.
 *
 * The fn is rate-limited server-side (1 request per 24h per user).
 * Surfacing the 429 to the user is handled by `friendlyError()` in
 * the calling screen.
 */

import { getSupabase } from '@/lib/supabase/client';
import { getSupabaseEnv, isSupabaseConfigured } from '@/lib/supabase/env';

export interface RequestMyDataExportResult {
  ok: true;
  delivered_to: 'email' | 'client';
  /** ISO timestamp the signed URL expires. */
  expires_at: string;
  /**
   * Direct signed Storage URL. Always returned; emailed too when the
   * user has an email on file. UI may surface "Open download" as a
   * fallback for users without email (rare).
   */
  download_url?: string;
}

export async function requestMyDataExport(): Promise<RequestMyDataExportResult> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }
  const { url, anonKey } = getSupabaseEnv();
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not ready.');

  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;
  if (!accessToken) {
    throw new Error('Please sign in to download your data.');
  }

  const response = await fetch(`${url}/functions/v1/export-my-data`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({}),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : `Data export failed (${response.status}).`;
    throw new Error(message);
  }

  return payload as RequestMyDataExportResult;
}
