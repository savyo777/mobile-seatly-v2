// Centralized error-to-user-message translation.
//
// Replaces every "err instanceof Error ? err.message : 'fallback'" pattern
// in the app with a single helper that:
//
//   1. Returns a friendly string the user can safely see (never leaks
//      Supabase column names, RLS policy names, Stripe internal codes,
//      Postgres SQLSTATE numbers, or any other server-internal detail).
//   2. Logs the raw error to console.warn in __DEV__ so devs can still
//      diagnose. Production builds get no console output.
//   3. Never throws. The return value is always a string safe to render.
//
// Public API:
//
//   friendlyError(err, fallback?): string
//   isUserCancellation(err): boolean   ← Stripe PaymentSheet "Canceled"
//
// Usage pattern:
//
//   try {
//     await something();
//   } catch (err) {
//     Alert.alert('Title', friendlyError(err, 'Could not save your hours.'));
//   }
//
// The optional `fallback` is the context-specific copy to use when the
// error doesn't match any known code in the lookup table. Omit it for the
// generic "Something went wrong. Please try again."

const GENERIC_FALLBACK = 'Something went wrong. Please try again.';

// User dismissed a sheet / modal — not a real error. Callers should silently
// return instead of showing this string.
const USER_CANCELLATION_MARKER = '';

// ────────────────────────────────────────────────────────────────────────────
// Lookup tables. Single source of truth for friendly copy.
// ────────────────────────────────────────────────────────────────────────────

// Hey Cenaiva / paid-AI codes (hoisted from CenaivaAssistantProvider.tsx).
const CENAIVA_MESSAGES: Record<string, string> = {
  not_authenticated: 'Please sign in to continue.',
  timeout: 'The assistant is taking a while. Try again.',
  rate_limit_minute: 'Slow down for a moment and try again.',
  rate_limit_day: "You've used Hey Cenaiva a lot today. Try again tomorrow.",
  paid_usage_budget_exceeded:
    "You've used Hey Cenaiva a lot today. Try again tomorrow.",
};

// Cenaiva voice-specific codes (hoisted from CenaivaAssistantProvider.tsx).
const CENAIVA_VOICE_MESSAGES: Record<string, string> = {
  microphone_permission_denied:
    'Microphone access is off. Enable it to use Hey Cenaiva.',
  microphone_unavailable:
    'Microphone is unavailable right now. Try again in a moment.',
  speech_recognition_failed: "We couldn't catch that. Try speaking again.",
  speech_recognition_unavailable:
    'Voice is unavailable on this device right now.',
  deepgram_token_failed: 'Voice service is unavailable. Try again later.',
  deepgram_connection_failed: 'Voice service is unavailable. Try again later.',
};

// Reservation-hold codes (mirror HoldUnavailableReason in lib/booking/holdApi.ts).
const HOLD_MESSAGES: Record<string, string> = {
  no_table: "We couldn't find an available table at that time. Pick another.",
  over_cover_cap: 'That time is fully booked. Pick another slot.',
  diner_double_book:
    'You already have a booking at this time. Cancel that one first or pick a different slot.',
  rate_limited: 'Too many requests right now — wait a moment and try again.',
  shift_not_found: 'That time is no longer available.',
  hold_not_found:
    "Your table hold expired. Please pick a time again to keep going.",
  hold_expired:
    'Your hold ended. Pick the time again to keep your reservation.',
  hold_not_convertible:
    "We couldn't finalize your reservation. Try again or pick a different time.",
  payment_not_succeeded:
    "Your payment didn't go through. Please try again or use a different card.",
  payment_amount_too_low:
    'The amount due changed — confirm the new total to keep going.',
  network: 'Network hiccup. Please try again.',
};

// Booking modify / cancel codes (hoisted from publicBookingApi.ts).
const BOOKING_MESSAGES: Record<string, string> = {
  slot_taken: 'That time was just booked by someone else. Pick another slot.',
  modify_requires_card:
    'Adding to your party size needs a card on file. Add one in Account → Payment and try again.',
  past_shift_close: 'That time is past the shift close. Pick an earlier slot.',
  closed: 'The restaurant is closed on that date.',
  no_floor_capacity: 'This restaurant has no available tables.',
  not_modifiable:
    "This reservation can't be modified — contact the restaurant if you need help.",
};

// Stripe SDK + card decline codes.
const STRIPE_MESSAGES: Record<string, string> = {
  card_declined: 'Your card was declined. Try a different card.',
  insufficient_funds:
    "Your card didn't have enough funds. Try a different card.",
  expired_card: 'Your card has expired. Add a new card and try again.',
  incorrect_cvc: "The security code didn't match. Try again.",
  processing_error:
    "We couldn't process your card. Try again or use a different one.",
  authentication_required:
    'Your bank needs to verify this payment. Try again — you may be asked for additional confirmation.',
  incorrect_number: 'That card number looks wrong. Check it and try again.',
  incorrect_zip: "The ZIP/postal code didn't match. Try again.",
  // Stripe RN's "user dismissed the sheet" code — handled specially below.
  Canceled: USER_CANCELLATION_MARKER,
  // Generic "Failed" from Stripe SDK without a specific reason.
  Failed: 'Could not complete payment. Please try again.',
};

// Supabase auth (gotrue) error codes.
const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Wrong email or password.',
  user_not_found: "We couldn't find an account with that email.",
  email_not_confirmed:
    'Confirm your email first — check your inbox for the verification link.',
  signup_disabled: "Sign-ups aren't open right now.",
  otp_expired: 'That code expired. Request a new one.',
  weak_password: 'Use a stronger password (at least 8 characters).',
  email_already_exists: 'An account with this email already exists.',
  invalid_email: "That email doesn't look right. Check it and try again.",
  over_email_send_rate_limit:
    "We've sent too many emails. Wait a few minutes and try again.",
  over_sms_send_rate_limit:
    "We've sent too many texts. Wait a few minutes and try again.",
  bad_jwt: 'Your session expired. Please sign in again.',
  refresh_token_not_found: 'Your session expired. Please sign in again.',
  session_not_found: 'Your session expired. Please sign in again.',
};

// Postgres SQLSTATE codes — selective subset that maps to user-friendly causes.
// We never expose the raw error message; the friendly text is generic on
// purpose. The console.warn in __DEV__ keeps the real cause visible to devs.
const POSTGRES_SQLSTATE_MESSAGES: Record<string, string> = {
  '23505': 'That item already exists.',
  '23503': "Couldn't update — a related record was missing.",
  '42501': "You don't have permission to do that.",
  '42P01': 'This feature is unavailable right now.',
  '42703': 'This feature is unavailable right now.',
  '28P01': "Couldn't verify your sign-in. Please try again.",
  '40001': 'Try again in a moment.',
  PGRST116: "We couldn't find what you were looking for.",
  PGRST301: "You don't have permission to do that.",
};

// Account-deletion + restaurant-removal codes (hoisted from accountSecurity.ts).
const ACCOUNT_MESSAGES: Record<string, string> = {
  unauthorized: 'Please sign in again before continuing.',
  owns_restaurants:
    'Remove your restaurants before deleting this owner account.',
};

// ────────────────────────────────────────────────────────────────────────────
// Reason-code extraction. Inspects shape, not class.
// ────────────────────────────────────────────────────────────────────────────

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

// Pull every plausible "code" / "reason" field off the error and return the
// list in priority order. The first match against any lookup table wins.
function extractCandidateCodes(err: unknown): string[] {
  const out: string[] = [];
  const rec = asRecord(err);
  if (rec) {
    // Standard places where libraries put a code.
    // `unavailable_reason` is what lib/booking/publicBookingApi.ts stamps
    // on thrown errors when the server returns a 4xx with a known reason
    // (slot_taken, diner_double_book, etc.).
    for (const key of [
      'code',
      'reason',
      'name',
      'declineCode',
      'errorCode',
      'unavailable_reason',
    ]) {
      const v = asString(rec[key]);
      if (v) out.push(v);
    }
    // Nested error objects (Stripe SDK has both shapes).
    const nested = asRecord(rec.error);
    if (nested) {
      for (const key of ['code', 'reason', 'name', 'declineCode']) {
        const v = asString(nested[key]);
        if (v) out.push(v);
      }
    }
  }
  return out;
}

// Try to pull a Postgres SQLSTATE off the error. Supabase puts it on `code`
// as a 5-character string for table-level errors and "PGRST###" for
// PostgREST-layer errors.
function extractSqlState(err: unknown): string | null {
  const rec = asRecord(err);
  if (!rec) return null;
  const code = asString(rec.code);
  if (!code) return null;
  if (/^[0-9A-Z]{5}$/.test(code)) return code; // SQLSTATE
  if (/^PGRST\d+$/.test(code)) return code; // PostgREST
  return null;
}

// Detect Stripe PaymentSheet user-cancellation specifically. Used by both
// friendlyError (returns USER_CANCELLATION_MARKER) and isUserCancellation.
function looksLikeUserCancellation(err: unknown): boolean {
  const codes = extractCandidateCodes(err);
  return codes.some((c) => c === 'Canceled' || c === 'cancelled');
}

// Best-effort raw text from any error shape — used only to scan for known
// substring patterns (e.g. "Function not found" → owns_restaurants flow).
function rawText(err: unknown): string {
  if (typeof err === 'string') return err;
  const rec = asRecord(err);
  if (rec) {
    for (const key of ['message', 'details', 'hint']) {
      const v = asString(rec[key]);
      if (v) return v;
    }
  }
  if (err instanceof Error) return err.message;
  return '';
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Map any error to a user-safe string. Never throws. In __DEV__, console.warns
 * the raw error so devs can still diagnose. In production, no console output.
 *
 * @param err Any value caught from a `catch` block.
 * @param fallback Context-specific friendly copy when no code matches.
 *   Omit to get the generic "Something went wrong. Please try again."
 */
export function friendlyError(err: unknown, fallback?: string): string {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn('[friendlyError]', { context: fallback ?? null, raw: err });
  }

  if (err == null) return fallback ?? GENERIC_FALLBACK;

  // User cancellation comes first — return empty so the call site can suppress.
  if (looksLikeUserCancellation(err)) return USER_CANCELLATION_MARKER;

  // Code-based lookup across all known tables.
  const candidates = extractCandidateCodes(err);
  for (const code of candidates) {
    if (code in CENAIVA_MESSAGES) return CENAIVA_MESSAGES[code];
    if (code in CENAIVA_VOICE_MESSAGES) return CENAIVA_VOICE_MESSAGES[code];
    if (code in HOLD_MESSAGES) return HOLD_MESSAGES[code];
    if (code in BOOKING_MESSAGES) return BOOKING_MESSAGES[code];
    if (code in STRIPE_MESSAGES) return STRIPE_MESSAGES[code];
    if (code in AUTH_MESSAGES) return AUTH_MESSAGES[code];
    if (code in ACCOUNT_MESSAGES) return ACCOUNT_MESSAGES[code];
  }

  // SQLSTATE / PGRST lookup.
  const sqlState = extractSqlState(err);
  if (sqlState && sqlState in POSTGRES_SQLSTATE_MESSAGES) {
    return POSTGRES_SQLSTATE_MESSAGES[sqlState];
  }

  // Network-shaped errors.
  const text = rawText(err).toLowerCase();
  if (text.includes('network') || text.includes('failed to fetch')) {
    return 'Network hiccup. Please try again.';
  }
  if (text.includes('abort')) {
    return 'That took too long. Please try again.';
  }
  // Common Supabase Edge Functions error when the function returns non-2xx
  // and the JS client wraps it — totally useless for users.
  if (text.includes('non-2xx status code')) {
    return fallback ?? 'This feature is unavailable right now.';
  }
  // "function not found" → from delete-account RPC flow when the server-side
  // function name doesn't exist on this environment.
  if (text.includes('function') && text.includes('not found')) {
    return 'This feature is unavailable right now.';
  }

  return fallback ?? GENERIC_FALLBACK;
}

/**
 * Returns true when the error is a user-dismiss signal from a sheet / modal
 * (Stripe PaymentSheet, image picker, etc.). Call sites use this to decide
 * whether to show an Alert at all:
 *
 *   if (isUserCancellation(err)) return;
 *   Alert.alert('Title', friendlyError(err, '...'));
 */
export function isUserCancellation(err: unknown): boolean {
  return looksLikeUserCancellation(err);
}

// Re-exports so other modules don't need to duplicate the friendly copy.
// The `MODIFY_REASON_MESSAGES` object that lib/booking/publicBookingApi.ts
// used to own is the same as BOOKING_MESSAGES + a couple of holdover keys.
export const FRIENDLY_BOOKING_MESSAGES = BOOKING_MESSAGES;
export const FRIENDLY_HOLD_MESSAGES = HOLD_MESSAGES;
export const FRIENDLY_AUTH_MESSAGES = AUTH_MESSAGES;
export const FRIENDLY_STRIPE_MESSAGES = STRIPE_MESSAGES;
