/**
 * Build 3c — client wrapper for the `request-refund` edge function.
 * Implements ToS §10.3 (5-business-day refund SLA + in-app self-service path).
 */

import { getSupabase } from '@/lib/supabase/client';
import { getSupabaseEnv, isSupabaseConfigured } from '@/lib/supabase/env';

export type RefundReasonCode = 'duplicate' | 'failed' | 'other';

export interface SubmitRefundRequestArgs {
  reservation_id?: string;
  payment_intent_id?: string;
  reason_code: RefundReasonCode;
  reason_text?: string;
}

export interface SubmitRefundRequestResult {
  ok: true;
  id: string;
  status: 'pending' | 'auto_resolved';
  message: string;
}

export async function submitRefundRequest(
  args: SubmitRefundRequestArgs,
): Promise<SubmitRefundRequestResult> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
  const { url, anonKey } = getSupabaseEnv();
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not ready.');

  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;
  if (!accessToken) throw new Error('Please sign in to request a refund.');

  const response = await fetch(`${url}/functions/v1/request-refund`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(args),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.error === 'string' ? payload.error : `Refund request failed (${response.status}).`;
    throw new Error(message);
  }
  return payload as SubmitRefundRequestResult;
}
