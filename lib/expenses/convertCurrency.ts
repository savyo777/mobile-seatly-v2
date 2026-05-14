import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { getSupabase } from '@/lib/supabase/client';
import { getSupabaseEnv, isSupabaseConfigured } from '@/lib/supabase/env';

export interface ConvertCurrencyArgs {
  amount: number;
  /** ISO 4217 source currency code (case-insensitive). */
  from: string;
  /** ISO 4217 target currency code (case-insensitive). */
  to: string;
  /** Optional ISO date for historical FX lookup. */
  date?: string | null;
}

export interface ConvertCurrencySuccess {
  ok: true;
  convertedAmount: number;
  rate: number;
  sourceCurrency: string;
  targetCurrency: string;
  provider: string;
  quotedAt: string;
}

export interface ConvertCurrencyFailure {
  ok: false;
  /**
   * - `same_currency`: from and to matched after normalization. Caller can keep
   *   the original amount and skip the conversion UI.
   * - `not_configured`: Supabase env missing on device.
   * - `unauthorized`: no auth session.
   * - `provider_error`: upstream FX provider returned non-2xx or no usable rate.
   * - `network_error`: fetch threw or timed out.
   * - `invalid_input`: amount/currency could not be parsed.
   */
  reason:
    | 'same_currency'
    | 'not_configured'
    | 'unauthorized'
    | 'provider_error'
    | 'network_error'
    | 'invalid_input';
  message?: string;
}

export type ConvertCurrencyResult = ConvertCurrencySuccess | ConvertCurrencyFailure;

const CONVERT_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number, controller: AbortController): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`convertCurrency timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function normalizeCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(trimmed) ? trimmed : null;
}

/**
 * Converts `amount` from one currency to another using the convert-currency
 * edge function. Never throws — returns a typed failure so the caller can
 * decide whether to keep the original receipt amount and ask the user to
 * confirm.
 */
export async function convertCurrency({
  amount,
  from,
  to,
  date,
}: ConvertCurrencyArgs): Promise<ConvertCurrencyResult> {
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, reason: 'invalid_input', message: 'amount' };
  }
  const fromCode = normalizeCode(from);
  const toCode = normalizeCode(to);
  if (!fromCode || !toCode) {
    return { ok: false, reason: 'invalid_input', message: 'currency' };
  }
  if (fromCode === toCode) {
    return { ok: false, reason: 'same_currency' };
  }

  // Demo mode: synthesize a deterministic conversion so the flow demos
  // end-to-end without hitting the network.
  if (isDemoModeEnabled()) {
    const rate = 1.37;
    return {
      ok: true,
      convertedAmount: Math.round(amount * rate * 100) / 100,
      rate,
      sourceCurrency: fromCode.toLowerCase(),
      targetCurrency: toCode.toLowerCase(),
      provider: 'demo',
      quotedAt: new Date().toISOString(),
    };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'not_configured' };
  }

  try {
    const supabase = getSupabase();
    let accessToken: string | null = null;
    try {
      const sessionResponse = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      accessToken = sessionResponse.data?.session?.access_token ?? null;
    } catch {
      accessToken = null;
    }
    if (!accessToken) {
      return { ok: false, reason: 'unauthorized' };
    }

    const { url, anonKey } = getSupabaseEnv();
    const endpoint = `${url.replace(/\/+$/, '')}/functions/v1/convert-currency`;

    const controller = new AbortController();
    const response = await withTimeout(
      fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          amount,
          from: fromCode,
          to: toCode,
          date: date ?? null,
        }),
      }),
      CONVERT_TIMEOUT_MS,
      controller,
    );

    if (!response.ok) {
      return { ok: false, reason: 'provider_error', message: `status_${response.status}` };
    }

    const json = (await response.json()) as Partial<ConvertCurrencySuccess> & {
      error?: string;
    };
    if (
      typeof json.convertedAmount !== 'number' ||
      typeof json.rate !== 'number' ||
      !json.sourceCurrency ||
      !json.targetCurrency
    ) {
      return { ok: false, reason: 'provider_error', message: json.error ?? 'malformed_response' };
    }

    return {
      ok: true,
      convertedAmount: json.convertedAmount,
      rate: json.rate,
      sourceCurrency: String(json.sourceCurrency).toLowerCase(),
      targetCurrency: String(json.targetCurrency).toLowerCase(),
      provider: String(json.provider ?? 'fx'),
      quotedAt: String(json.quotedAt ?? new Date().toISOString()),
    };
  } catch (err) {
    if (__DEV__) console.warn('convertCurrency: failed', err);
    return { ok: false, reason: 'network_error', message: String((err as Error)?.message ?? err) };
  }
}
