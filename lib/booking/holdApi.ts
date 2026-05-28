import { getSupabase } from '@/lib/supabase/client';
import { getSupabaseEnv, isSupabaseConfigured } from '@/lib/supabase/env';

export type HoldSource = 'web' | 'cenaiva' | 'app' | 'host';

export type HoldUnavailableReason =
  | 'no_table'
  | 'over_cover_cap'
  | 'diner_double_book'
  | 'rate_limited'
  | 'shift_not_found'
  | 'hold_not_found'
  | 'hold_expired'
  | 'hold_not_convertible'
  | 'payment_not_succeeded'
  | 'payment_amount_too_low'
  | 'network'
  | 'unknown';

export type CreateHoldRequest = {
  restaurant_id: string;
  shift_id: string;
  date_time: string;
  party_size: number;
  source: HoldSource;
  idempotency_key: string;
  event_id?: string | null;
  promotion_id?: string | null;
  applied_promo_code?: string | null;
};

export type CreateHoldResponse = {
  hold_id: string;
  confirmation_code: string;
  table_ids: string[];
  duration_minutes: number;
  expires_at: string;
  deposit_amount_cents: number;
  server_now: string;
};

export type UpdateHoldRequest = {
  hold_id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  special_request?: string;
  dietary_notes?: string;
  occasion?: string;
  seating_preference?: string;
  cart_snapshot?: Record<string, unknown>;
  total_amount_cents?: number;
};

export type HeartbeatHoldResponse = { expires_at: string };

export type ConfirmHoldPaidResponse = {
  reservation_id: string;
  confirmation_code: string;
  table_ids: string[];
  duration_minutes: number;
  idempotent: boolean;
};

export class HoldApiError extends Error {
  status: number;
  reason: HoldUnavailableReason;
  constructor(message: string, status: number, reason: HoldUnavailableReason) {
    super(message);
    this.name = 'HoldApiError';
    this.status = status;
    this.reason = reason;
  }
}

const HOLD_REQUEST_TIMEOUT_MS = 8000;

function assertConfigured() {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
  return getSupabaseEnv();
}

async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' || /abort/i.test(error.message))
  );
}

export function mapHoldErrorCode(value: unknown): HoldUnavailableReason {
  if (typeof value !== 'string') return 'unknown';
  switch (value) {
    case 'no_table':
    case 'over_cover_cap':
    case 'diner_double_book':
    case 'rate_limited':
    case 'shift_not_found':
    case 'hold_not_found':
    case 'hold_expired':
    case 'hold_not_convertible':
    case 'payment_not_succeeded':
    case 'payment_amount_too_low':
    case 'network':
      return value;
    default:
      return 'unknown';
  }
}

async function postHoldEndpoint<T>(
  pathname: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const { url, anonKey } = assertConfigured();
  const token = await getAccessToken();
  const controller = new AbortController();
  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const timeout = setTimeout(() => controller.abort(), HOLD_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${url}/functions/v1/${pathname}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new HoldApiError('Network timeout', 0, 'network');
    }
    throw new HoldApiError(error instanceof Error ? error.message : 'Network error', 0, 'network');
  } finally {
    clearTimeout(timeout);
  }

  const payload = await response.json().catch(() => ({})) as
    | (T & { error?: unknown; unavailable_reason?: string })
    | { error?: unknown; unavailable_reason?: string };

  if (!response.ok || (payload as { error?: unknown }).error) {
    const reason = mapHoldErrorCode((payload as { unavailable_reason?: string }).unavailable_reason);
    const message =
      typeof (payload as { error?: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : `Hold request failed (${response.status}).`;
    throw new HoldApiError(message, response.status, reason);
  }

  return payload as T;
}

export function createReservationHold(body: CreateHoldRequest): Promise<CreateHoldResponse> {
  return postHoldEndpoint<CreateHoldResponse>('create-reservation-hold', body);
}

export function updateReservationHold(body: UpdateHoldRequest): Promise<{ ok: true }> {
  return postHoldEndpoint<{ ok: true }>('update-reservation-hold', body);
}

export function heartbeatReservationHold(
  hold_id: string,
  extend_seconds = 120,
): Promise<HeartbeatHoldResponse> {
  return postHoldEndpoint<HeartbeatHoldResponse>('heartbeat-reservation-hold', {
    hold_id,
    extend_seconds,
  });
}

export function cancelReservationHold(hold_id: string): Promise<{ ok: true }> {
  return postHoldEndpoint<{ ok: true }>('cancel-reservation-hold', { hold_id });
}

export function confirmHoldPaid(
  hold_id: string,
  payment_intent_id: string,
): Promise<ConfirmHoldPaidResponse> {
  return postHoldEndpoint<ConfirmHoldPaidResponse>('confirm-hold-paid', {
    hold_id,
    payment_intent_id,
  });
}

export type CreateHoldPaymentIntentRequest = {
  /**
   * Hold-aware atomic conversion. Pass to convert a reservation_holds
   * row into a confirmed reservation as part of the same PI flow. The
   * mobile single-pay path always provides this; omit only for the
   * magic-link / deposit-only flows where no hold exists.
   */
  hold_id?: string;
  restaurant_id: string;
  amount_cents: number;
  currency?: string;
  customer_email?: string | null;
  customer_name?: string | null;
  /**
   * When true AND the diner is logged in, the server adds
   * `setup_future_usage: 'off_session'` + the diner's customer to the
   * PaymentIntent so the PM stays attached after the charge and can be
   * surfaced in the saved-cards picker on future bookings. Per
   * MOBILE_STRIPE_TRANSFER.md §8, both client (PaymentSheet config)
   * and server (this flag) must agree or Stripe rejects with
   * "does not match". Mobile pairs this with
   * `PaymentSheet.Configuration.intentConfiguration` setupFutureUsage =
   * 'OffSession' in step6-payment.tsx.
   */
  save_card?: boolean;
  /**
   * Per-booking-attempt idempotency key (UUID v4). Required to fix
   * Bug #110 (PI reuse across same-amount bookings with same saved
   * card). Per CLAUDE_SKILLS.md (Stripe) §12 (FIXED 2026-05-21):
   * before this fix the server derived its Stripe idempotency key
   * from `${profile.id}_${cardId}_${amount}`, causing identical
   * second-booking PIs to dedup into the FIRST booking's PI. The
   * server now uses this client-supplied UUID when present, falling
   * back to the legacy amount-derived key only for old mobile builds
   * that don't yet send the field. Generate a FRESH UUID per submit.
   */
  idempotency_key?: string;
};

export type CreateHoldPaymentIntentResponse = {
  client_secret: string;
  payment_intent_id: string;
  amount_cents: number;
  publishable_key?: string;
};

export function createHoldPaymentIntent(
  body: CreateHoldPaymentIntentRequest,
): Promise<CreateHoldPaymentIntentResponse> {
  return postHoldEndpoint<CreateHoldPaymentIntentResponse>('create-public-payment-intent', body);
}

export type RefundPaymentIntentResponse = { ok: true };

export function refundPaymentIntent(payment_intent_id: string): Promise<RefundPaymentIntentResponse> {
  return postHoldEndpoint<RefundPaymentIntentResponse>('refund-payment-intent', {
    payment_intent_id,
  });
}

// DELETED 2026-05-23: fireAndForgetCancel was unused dead code (only
// referenced in a useReservationHold comment explaining why the
// unmount-cleanup effect was removed). The function also bypassed the
// Authorization header, which is incompatible with the new mandatory
// JWT gating on cancel-reservation-hold. Use cancelReservationHold
// (the awaited, JWT-bearing variant above) from explicit user actions
// only — there is no longer an anon path.
