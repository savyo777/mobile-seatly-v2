/**
 * Build 3f — client wrapper for diner referrals (ToS §9.3).
 *
 * Two edge fns:
 *   - get-my-referral-code: returns the diner's code; mints one lazily if absent.
 *   - redeem-referral: applies a friend's code to the caller's account
 *     (status='pending' until first booking).
 *
 * Reward issuance is gated on Build 3g (loyalty points ledger). Until
 * that ships, redeem-referral records the relationship but no points
 * change hands. The mobile UI is honest about this.
 */

import { getSupabase } from '@/lib/supabase/client';
import { getSupabaseEnv, isSupabaseConfigured } from '@/lib/supabase/env';

async function callEdge<T>(path: string, body?: unknown): Promise<T> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
  const { url, anonKey } = getSupabaseEnv();
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not ready.');
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;
  if (!accessToken) throw new Error('Please sign in.');
  const response = await fetch(`${url}/functions/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : `Failed (${response.status}).`;
    throw new Error(message);
  }
  return payload as T;
}

export async function getMyReferralCode(): Promise<string> {
  const result = await callEdge<{ ok: true; code: string }>('get-my-referral-code');
  return result.code;
}

export interface RedeemReferralResult {
  ok: true;
  referral_id: string;
  message: string;
}

export async function redeemReferralCode(code: string): Promise<RedeemReferralResult> {
  return callEdge<RedeemReferralResult>('redeem-referral', { code: code.trim().toUpperCase() });
}

/** Build the canonical share URL for a referral code. */
export function buildReferralShareLink(code: string): string {
  const host = process.env.EXPO_PUBLIC_CENAIVA_REFERRAL_HOST ?? 'https://cenaiva.com';
  return `${host}/r/${encodeURIComponent(code)}`;
}
