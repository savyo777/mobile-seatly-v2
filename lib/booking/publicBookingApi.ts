import { getSupabase } from '@/lib/supabase/client';
import { getSupabaseEnv, isSupabaseConfigured } from '@/lib/supabase/env';
import { getMockShiftConfig, getMockTimeSlots } from '@/lib/mock/bookingAvailability';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { getCachedRestaurantById } from '@/lib/data/restaurantCatalog';
import { makeConfirmationCode } from '@/lib/booking/confirmationCode';

export type AvailabilitySlot = {
  shift_id: string;
  shift_name: string;
  date_time: string;
  display_time: string;
  table_ids?: string[];
  duration_minutes?: number;
  floor_capacity?: number;
};

export type AvailabilityResponse = {
  slots: AvailabilitySlot[];
  floorCapacity: number | null;
};

export type PublicBookingCartItem = {
  menu_item_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
};

export type PublicBookingPayload = {
  restaurant_id: string;
  shift_id: string;
  date_time: string;
  party_size: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  allergies: string | null;
  seating_preference: string | null;
  occasion: string | null;
  cart_items: PublicBookingCartItem[];
  subtotal: number;
  tax_amount: number;
  tip_amount: number;
  total_amount: number;
  discount_amount: number | null;
  discount_reason: string | null;
  promotion_id: string | null;
  payment_method: 'card' | 'split';
  // When set and the server's CENAIVA_HOLDS_ENABLED flag is on, the booking
  // is created by converting an existing reservation_holds row. Otherwise the
  // legacy book_reservation path runs unchanged.
  hold_id?: string | null;
};

export type PublicBookingResponse = {
  reservation_id: string;
  order_id: string | null;
  confirmation_code: string;
  table_ids: string[];
  duration_minutes: number | null;
  confirmation_delivery: 'sent' | 'skipped' | 'failed';
  confirmation_delivery_channel: 'email' | 'sms' | null;
  reused?: boolean;
  deposit_required?: boolean;
  deposit_amount_cents?: number;
  deposit_status?: DepositStatus;
  error?: string;
};

export type DepositStatus = 'none' | 'pending' | 'charged' | 'waived' | 'failed';

export type DepositPayer = {
  email: string;
  full_name: string;
  amount_cents: number;
};

export type PrepareDepositResponse = {
  payments: Array<{ id: string; amount_cents: number; email: string | null }>;
};

export type BookingProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  allergies: string[] | null;
  dietary_restrictions: string[] | null;
  seating_preference: string | null;
};

const AVAILABILITY_CACHE_TTL_MS = 45_000;
const AVAILABILITY_REQUEST_TIMEOUT_MS = 8000;
const BOOKING_REQUEST_TIMEOUT_MS = 12000;

const availabilityCache = new Map<string, { expiresAt: number; value: AvailabilityResponse }>();
const availabilityInflight = new Map<string, Promise<AvailabilityResponse>>();
const restaurantTimezoneCache = new Map<string, string | null>();

async function getRestaurantTimezone(restaurantId: string): Promise<string | null> {
  if (restaurantTimezoneCache.has(restaurantId)) {
    return restaurantTimezoneCache.get(restaurantId) ?? null;
  }
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from('restaurants')
      .select('timezone')
      .eq('id', restaurantId)
      .maybeSingle();
    const tz = (data as { timezone?: string | null } | null)?.timezone ?? null;
    restaurantTimezoneCache.set(restaurantId, tz);
    return tz;
  } catch {
    return null;
  }
}

function formatSlotDisplayTime(dateTime: string, timezone: string | null): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      ...(timezone ? { timeZone: timezone } : {}),
    });
    return formatter.format(new Date(dateTime));
  } catch {
    return new Date(dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
}

function isDemoRestaurantKey(value: string): boolean {
  const key = value.trim().toLowerCase();
  return mockRestaurants.some(
    (restaurant) => restaurant.id.toLowerCase() === key || restaurant.slug.toLowerCase() === key,
  );
}

function cacheAvailability(cacheKey: string, value: AvailabilityResponse): AvailabilityResponse {
  availabilityCache.set(cacheKey, {
    expiresAt: Date.now() + AVAILABILITY_CACHE_TTL_MS,
    value,
  });
  return value;
}

function demoAvailabilityFor(params: {
  restaurantId: string;
  date: string;
  partySize: number;
}): AvailabilityResponse | null {
  // Mock restaurants (r1, r3, r5, r7, etc.) don't exist in Supabase, so we
  // serve mock availability for them regardless of the demo-mode flag.
  // This keeps the events flow working when supabase is configured but the
  // mock restaurants don't have a real backend record.
  if (!isDemoRestaurantKey(params.restaurantId) || !getCachedRestaurantById(params.restaurantId)) {
    return null;
  }

  const partySize = Math.max(1, Math.floor(params.partySize));
  const shift = getMockShiftConfig(params.restaurantId);
  const slots = getMockTimeSlots(params.restaurantId, params.date, partySize)
    .filter((slot) => slot.available)
    .map<AvailabilitySlot>((slot) => {
      const time = slot.slotId.includes('T') ? slot.slotId.split('T')[1] : '18:00';
      return {
        shift_id: `demo-${params.restaurantId}`,
        shift_name: 'Dining room',
        date_time: `${params.date}T${time}:00`,
        display_time: slot.label,
        table_ids: [`demo-table-${params.restaurantId}`],
        duration_minutes: shift.slotDurationMinutes,
        floor_capacity: 150,
      };
    });

  return {
    slots,
    floorCapacity: slots.length ? 150 : null,
  };
}

function demoBookingFor(payload: PublicBookingPayload): PublicBookingResponse | null {
  // Mirror demoAvailabilityFor — mock restaurants always use the mock booking
  // path because they don't have a real Supabase row to write against.
  if (!isDemoRestaurantKey(payload.restaurant_id)) return null;
  const seed = `${payload.restaurant_id}-${payload.date_time}-${payload.guest_email}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const suffix = String(hash % 1000000).padStart(6, '0');
  return {
    reservation_id: `demo-res-${suffix}`,
    order_id: payload.cart_items.length ? `demo-order-${suffix}` : null,
    confirmation_code: makeConfirmationCode(),
    table_ids: payload.shift_id ? [`demo-table-${payload.restaurant_id}`] : [],
    duration_minutes: null,
    confirmation_delivery: 'skipped',
    confirmation_delivery_channel: null,
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function assertConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }
  return getSupabaseEnv();
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' || /abort/i.test(error.message))
  );
}

function isJunkErrorString(value: string): boolean {
  const lower = value.trim().toLowerCase();
  return (
    !lower ||
    lower === '[object object]' ||
    lower === 'object object' ||
    lower === '{}' ||
    lower === 'null' ||
    lower === 'undefined'
  );
}

// Backend-vocabulary regex. Any candidate string that matches this is
// treated as unsafe and replaced with the caller's fallback. Catches the
// most common Postgrest / Supabase Storage / Postgres internals that
// shouldn't reach user UI.
const BACKEND_LEAK_PATTERN =
  /Postgrest|PGRST\d+|JWT|RLS|row.level|relation "[^"]+" does not exist|column "[^"]+" of relation|violates [a-z_]+ constraint|new row violates|duplicate key value/i;

function coerceErrorMessage(value: unknown, fallback: string): string {
  // Returns the caller-supplied fallback unless the value is a SAFE
  // user-facing string. Previously this would happily return any
  // non-junk string OR any `message`/`detail`/`description` field from
  // a backend error object — that path leaked Postgrest codes and RLS
  // policy names into the UI whenever a caller bypassed `friendlyError`.
  // Now we whitelist: strings only, must not match BACKEND_LEAK_PATTERN.
  // Object inputs always fall through to the fallback (they're shaped
  // like backend error responses, never user-safe copy).
  const safeString = (s: string) =>
    !isJunkErrorString(s) && !BACKEND_LEAK_PATTERN.test(s);

  if (typeof value === 'string' && safeString(value)) {
    return value.trim();
  }
  if (__DEV__ && value) console.warn('[booking] coerced error (suppressed in UI):', value);
  return fallback;
}

export async function getAvailability(params: {
  restaurantId: string;
  date: string;
  partySize: number;
}): Promise<AvailabilityResponse> {
  const partySize = Math.max(1, Math.floor(params.partySize));
  const cacheKey = `${params.restaurantId}|${params.date}|${partySize}`;
  const cached = availabilityCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const existing = availabilityInflight.get(cacheKey);
  if (existing) return existing;

  const demoFallback = demoAvailabilityFor({ ...params, partySize });
  if (!isSupabaseConfigured()) {
    return cacheAvailability(cacheKey, demoFallback ?? { slots: [], floorCapacity: null });
  }

  const request = (async () => {
    const supabase = getSupabase();
    if (!supabase) {
      if (demoFallback) return cacheAvailability(cacheKey, demoFallback);
      throw new Error('Supabase is not configured.');
    }

    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), AVAILABILITY_REQUEST_TIMEOUT_MS);

    let body: {
      slots?: Array<{
        shift_id: string;
        shift_name?: string;
        date_time: string;
        table_ids?: string[];
        duration_minutes?: number;
      }>;
      floor_capacity?: number;
      unavailable_reason?: string | null;
    } | null;
    try {
      // NOTE (Phase 3a): a client-side port of this RPC lives at
      // `lib/booking/slotGenerator.ts:generateAvailabilitySlots`. It is NOT
      // wired here because the customer booking flow runs as the anon role
      // (or as a non-staff signed-in customer) and RLS on `reservations`
      // hides other users' bookings, which would silently report taken
      // slots as available. The helper is safe for staff previews; swap
      // this call only after verifying byte-identical output to the RPC.
      const { data, error } = await supabase.rpc('get_available_slots_cached', {
        p_restaurant_id: params.restaurantId,
        p_date: params.date,
        p_party_size: partySize,
      });
      if (error) {
        if (demoFallback) return cacheAvailability(cacheKey, demoFallback);
        throw new Error(coerceErrorMessage(error.message, 'Could not load availability.'));
      }
      body = (data ?? null) as typeof body;
    } finally {
      clearTimeout(timeoutId);
    }

    const timezone = await getRestaurantTimezone(params.restaurantId);

    const rpcSlots = body?.slots ?? [];
    const slots: AvailabilitySlot[] = rpcSlots
      .filter((slot) => new Date(slot.date_time).getTime() >= Date.now())
      .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())
      .map((slot) => ({
        shift_id: slot.shift_id,
        shift_name: slot.shift_name ?? '',
        date_time: slot.date_time,
        display_time: formatSlotDisplayTime(slot.date_time, timezone),
        table_ids: slot.table_ids ?? [],
        duration_minutes: slot.duration_minutes,
        floor_capacity: body?.floor_capacity,
      }));

    if (!slots.length && demoFallback?.slots.length) {
      return cacheAvailability(cacheKey, demoFallback);
    }

    const value: AvailabilityResponse = {
      slots,
      floorCapacity: body?.floor_capacity ?? null,
    };
    return cacheAvailability(cacheKey, value);
  })()
    .catch((error) => {
      if (demoFallback) return cacheAvailability(cacheKey, demoFallback);
      if (isAbortError(error)) {
        throw new Error('Availability is taking longer than expected. Please try again.');
      }
      throw error;
    })
    .finally(() => {
      availabilityInflight.delete(cacheKey);
    });

  availabilityInflight.set(cacheKey, request);
  return request;
}

export async function createPublicBooking(
  payload: PublicBookingPayload,
): Promise<PublicBookingResponse> {
  const demoFallback = demoBookingFor(payload);
  if (!isSupabaseConfigured() && demoFallback) return demoFallback;

  const { url, anonKey } = assertConfigured();
  const token = await getAccessToken();
  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BOOKING_REQUEST_TIMEOUT_MS);
  try {
    response = await fetch(`${url}/functions/v1/create-public-booking`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        ...payload,
        subtotal: roundMoney(payload.subtotal),
        tax_amount: roundMoney(payload.tax_amount),
        tip_amount: roundMoney(payload.tip_amount),
        total_amount: roundMoney(payload.total_amount),
        discount_amount: payload.discount_amount == null ? null : roundMoney(payload.discount_amount),
        cart_items: payload.cart_items.map((item) => ({
          ...item,
          quantity: Math.max(1, Math.floor(item.quantity)),
          unit_price: roundMoney(item.unit_price),
        })),
      }),
    });
  } catch (error) {
    if (demoFallback) return demoFallback;
    if (isAbortError(error)) {
      throw new Error('Confirming is taking longer than expected. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const body = await response.json().catch(() => ({})) as Partial<PublicBookingResponse> & { error?: unknown };
  if (!response.ok || body.error || !body.reservation_id) {
    if (demoFallback) return demoFallback;
    const error = new Error(coerceErrorMessage(body.error, 'Reservation failed.'));
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return body as PublicBookingResponse;
}

export async function prepareDeposit(params: {
  reservation_id: string;
  payers: DepositPayer[];
}): Promise<PrepareDepositResponse> {
  const { url, anonKey } = assertConfigured();
  const token = await getAccessToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BOOKING_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${url}/functions/v1/prepare-deposit`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(params),
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('Preparing the deposit is taking longer than expected. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const body = await response.json().catch(() => ({})) as Partial<PrepareDepositResponse> & { error?: unknown };
  if (!response.ok || body.error || !Array.isArray(body.payments)) {
    const error = new Error(coerceErrorMessage(body.error, 'Could not prepare the deposit.'));
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return { payments: body.payments };
}

export async function confirmDepositStub(params: {
  payment_id: string;
}): Promise<{ ok: true }> {
  const { url, anonKey } = assertConfigured();
  const token = await getAccessToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BOOKING_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${url}/functions/v1/confirm-deposit-stub`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(params),
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('Charging the deposit is taking longer than expected. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const body = await response.json().catch(() => ({})) as { ok?: boolean; error?: unknown };
  if (!response.ok || body.error || body.ok !== true) {
    const error = new Error(coerceErrorMessage(body.error, 'Could not charge the deposit.'));
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return { ok: true };
}

const AVAILABLE_DATES_TTL_MS = 60_000;
const availableDatesCache = new Map<string, { expiresAt: number; value: string[] }>();

export async function getAvailableDates(params: {
  restaurantId: string;
  partySize: number;
  startDate: string;
  endDate: string;
}): Promise<string[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const partySize = Math.max(1, Math.floor(params.partySize));
  const cacheKey = `${params.restaurantId}|${partySize}|${params.startDate}|${params.endDate}`;
  const cached = availableDatesCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  try {
    // NOTE (Phase 3a): a client-side port lives at
    // `lib/booking/availableDates.ts:findAvailableDates`. It is NOT wired
    // here for the same RLS reason as `get_available_slots_cached` above —
    // the underlying slot generator can't see other users' reservations
    // from a non-staff session, so dates with no truly-free slots would
    // appear available. Safe for staff previews; do not swap until the
    // anon-role visibility gap is addressed.
    const { data, error } = await supabase.rpc('restaurant_available_dates', {
      p_restaurant_id: params.restaurantId,
      p_party_size: partySize,
      p_start_date: params.startDate,
      p_end_date: params.endDate,
    });
    if (error || !Array.isArray(data)) return null;
    const value = (data as unknown[]).filter((item): item is string => typeof item === 'string');
    availableDatesCache.set(cacheKey, { expiresAt: Date.now() + AVAILABLE_DATES_TTL_MS, value });
    return value;
  } catch {
    return null;
  }
}

export type ModifyReservationPayload = {
  reservation_id: string;
  date?: string;
  time?: string;
  party_size?: number;
  special_request?: string;
  confirmation_code?: string;
};

export type ModifyReservationResponse = {
  ok: true;
  reservation_id: string;
  reserved_at: string;
  party_size: number;
  special_request: string | null;
  table_ids: string[];
  notification_delivery?: 'sent' | 'failed' | 'skipped';
  notification_delivery_channel?: 'sms' | 'email' | null;
};

const MODIFY_REASON_MESSAGES: Record<string, string> = {
  slot_taken: 'That time was just booked by someone else. Pick another slot.',
  no_table: 'No table fits your party at that time. Pick another slot.',
  over_cover_cap: 'That time is fully booked. Pick another slot.',
  shift_not_found: 'That booking time is no longer available.',
  not_modifiable: "This reservation can't be modified — contact the restaurant if you need help.",
  diner_double_book: 'You already have a reservation at this time.',
  past_shift_close: 'That time is past the shift close. Pick an earlier slot.',
  rate_limited: 'Too many requests — please wait a minute.',
  closed: 'The restaurant is closed on that date.',
  no_floor_capacity: 'This restaurant has no available tables.',
};

export async function modifyReservation(
  payload: ModifyReservationPayload,
): Promise<ModifyReservationResponse> {
  const { url, anonKey } = assertConfigured();
  const token = await getAccessToken();
  if (!token && !payload.confirmation_code) {
    const error = new Error('Sign in or supply a confirmation code to modify.');
    (error as Error & { status?: number }).status = 401;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BOOKING_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${url}/functions/v1/modify-reservation`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('Updating is taking longer than expected. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const body = await response.json().catch(() => ({})) as Partial<ModifyReservationResponse> & {
    error?: unknown;
    unavailable_reason?: string;
  };

  if (!response.ok || body.error) {
    const reason = body.unavailable_reason;
    const reasonMessage = reason ? MODIFY_REASON_MESSAGES[reason] : undefined;
    const fallback =
      reasonMessage ??
      (response.status === 401
        ? 'Sign in to modify this reservation.'
        : response.status === 404
          ? 'Reservation not found.'
          : 'Could not update the reservation.');
    const error = new Error(coerceErrorMessage(body.error, fallback));
    (error as Error & { status?: number; unavailable_reason?: string }).status = response.status;
    if (reason) (error as Error & { unavailable_reason?: string }).unavailable_reason = reason;
    throw error;
  }

  if (!body.reservation_id || !body.reserved_at) {
    throw new Error('Could not update the reservation.');
  }

  return {
    ok: true,
    reservation_id: body.reservation_id,
    reserved_at: body.reserved_at,
    party_size: body.party_size ?? payload.party_size ?? 0,
    special_request: body.special_request ?? null,
    table_ids: body.table_ids ?? [],
    notification_delivery: body.notification_delivery,
    notification_delivery_channel: body.notification_delivery_channel,
  };
}

export type ConflictWindow = { start: number; end: number };

export async function fetchActiveReservationWindows(params: {
  userProfileId: string;
  excludeReservationId?: string;
  lookbackHours?: number;
}): Promise<ConflictWindow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const lookbackMs = (params.lookbackHours ?? 6) * 60 * 60 * 1000;
  const since = new Date(Date.now() - lookbackMs).toISOString();
  const { data, error } = await supabase
    .from('reservations')
    .select('id, reserved_at, duration_minutes, status')
    .eq('user_profile_id', params.userProfileId)
    .gte('reserved_at', since)
    .in('status', ['pending', 'confirmed', 'seated']);
  if (error || !data) return [];
  const exclude = params.excludeReservationId;
  return data
    .filter((row) => row.id !== exclude)
    .map((row) => {
      const start = new Date(row.reserved_at).getTime();
      const duration = (row.duration_minutes ?? 90) * 60 * 1000;
      return { start, end: start + duration };
    })
    .filter((window) => Number.isFinite(window.start) && Number.isFinite(window.end));
}

export function slotConflictsWithWindows(
  slot: { date_time: string; duration_minutes?: number },
  windows: ConflictWindow[],
): boolean {
  const start = new Date(slot.date_time).getTime();
  if (!Number.isFinite(start)) return false;
  const duration = (slot.duration_minutes ?? 90) * 60 * 1000;
  const end = start + duration;
  return windows.some((window) => start < window.end && end > window.start);
}

export type CancelReservationPayload = {
  reservation_id: string;
  confirmation_code?: string;
};

export type CancelReservationResponse = {
  ok: true;
  reservation_id: string;
  status: 'cancelled';
  notification_delivery?: 'sent' | 'failed' | 'skipped';
  notification_delivery_channel?: 'sms' | 'email' | null;
};

export async function cancelReservation(
  payload: CancelReservationPayload,
): Promise<CancelReservationResponse> {
  const { url, anonKey } = assertConfigured();
  const token = await getAccessToken();
  if (!token && !payload.confirmation_code) {
    const error = new Error('Sign in or supply a confirmation code to cancel.');
    (error as Error & { status?: number }).status = 401;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BOOKING_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${url}/functions/v1/cancel-reservation`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('Cancelling is taking longer than expected. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const body = await response.json().catch(() => ({})) as Partial<CancelReservationResponse> & {
    error?: unknown;
    unavailable_reason?: string;
  };

  if (!response.ok || body.error) {
    const fallback =
      response.status === 401
        ? 'Sign in to cancel this reservation.'
        : response.status === 429 || body.unavailable_reason === 'rate_limited'
          ? 'Too many requests — please wait a minute.'
          : 'Could not cancel the reservation.';
    const error = new Error(coerceErrorMessage(body.error, fallback));
    (error as Error & { status?: number; unavailable_reason?: string }).status = response.status;
    if (body.unavailable_reason) {
      (error as Error & { unavailable_reason?: string }).unavailable_reason = body.unavailable_reason;
    }
    throw error;
  }

  return {
    ok: true,
    reservation_id: body.reservation_id ?? payload.reservation_id,
    status: 'cancelled',
    notification_delivery: body.notification_delivery,
    notification_delivery_channel: body.notification_delivery_channel,
  };
}

export async function fetchBookingProfile(): Promise<BookingProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id,full_name,email,phone,allergies,dietary_restrictions,seating_preference')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error) return null;
  return (data ?? null) as BookingProfile | null;
}

export function makeBookingCartParam(items: PublicBookingCartItem[]): string {
  if (!items.length) return '';
  return encodeURIComponent(JSON.stringify(items));
}

export function parseBookingCartParam(value: string | string[] | undefined): PublicBookingCartItem[] {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return [];
  try {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = JSON.parse(decodeURIComponent(raw));
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const row = item as Record<string, unknown>;
      const name = typeof row.name === 'string' ? row.name.trim() : '';
      const quantity = typeof row.quantity === 'number' ? row.quantity : Number(row.quantity);
      const unitPrice = typeof row.unit_price === 'number' ? row.unit_price : Number(row.unit_price);
      if (!name || !Number.isFinite(quantity) || quantity < 1 || !Number.isFinite(unitPrice)) return [];
      return [{
        menu_item_id: typeof row.menu_item_id === 'string' ? row.menu_item_id : null,
        name,
        quantity: Math.max(1, Math.floor(quantity)),
        unit_price: unitPrice,
      }];
    });
  } catch {
    return [];
  }
}

export function cartSubtotal(items: PublicBookingCartItem[]): number {
  return roundMoney(items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0));
}

export function selectedSlotMatches(slot: AvailabilitySlot, shiftId?: string | null, dateTime?: string | null): boolean {
  if (!shiftId || !dateTime || slot.shift_id !== shiftId) return false;
  return Math.abs(new Date(slot.date_time).getTime() - new Date(dateTime).getTime()) < 1000;
}
