import { getSupabase } from '@/lib/supabase/client';
import { getSupabaseEnv, isSupabaseConfigured } from '@/lib/supabase/env';

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
  error?: string;
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

const availabilityCache = new Map<string, { expiresAt: number; value: AvailabilityResponse }>();
const availabilityInflight = new Map<string, Promise<AvailabilityResponse>>();

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

export async function getAvailability(params: {
  restaurantId: string;
  date: string;
  partySize: number;
}): Promise<AvailabilityResponse> {
  const { url, anonKey } = assertConfigured();
  const partySize = Math.max(1, Math.floor(params.partySize));
  const cacheKey = `${params.restaurantId}|${params.date}|${partySize}`;
  const cached = availabilityCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const existing = availabilityInflight.get(cacheKey);
  if (existing) return existing;

  const request = (async () => {
    const token = await getAccessToken();
    const endpoint = new URL(`${url}/functions/v1/get-availability`);
    endpoint.searchParams.set('restaurant_id', params.restaurantId);
    endpoint.searchParams.set('date', params.date);
    endpoint.searchParams.set('party_size', String(partySize));

    const response = await fetch(endpoint.toString(), {
      headers: {
        apikey: anonKey,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const body = await response.json().catch(() => ({})) as {
      slots?: AvailabilitySlot[];
      floor_capacity?: number;
      error?: string;
    };

    if (!response.ok || body.error) {
      throw new Error(body.error ?? 'Could not load availability.');
    }

    const slots = (body.slots ?? [])
      .filter((slot) => new Date(slot.date_time).getTime() >= Date.now())
      .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());
    const value = {
      slots,
      floorCapacity:
        body.floor_capacity ??
        slots.find((slot) => typeof slot.floor_capacity === 'number')?.floor_capacity ??
        null,
    };
    availabilityCache.set(cacheKey, {
      expiresAt: Date.now() + AVAILABILITY_CACHE_TTL_MS,
      value,
    });
    return value;
  })().finally(() => {
    availabilityInflight.delete(cacheKey);
  });

  availabilityInflight.set(cacheKey, request);
  return request;
}

export async function createPublicBooking(
  payload: PublicBookingPayload,
): Promise<PublicBookingResponse> {
  const { url, anonKey } = assertConfigured();
  const token = await getAccessToken();
  const response = await fetch(`${url}/functions/v1/create-public-booking`, {
    method: 'POST',
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

  const body = await response.json().catch(() => ({})) as Partial<PublicBookingResponse>;
  if (!response.ok || body.error || !body.reservation_id) {
    const error = new Error(body.error ?? 'Reservation failed.');
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return body as PublicBookingResponse;
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
