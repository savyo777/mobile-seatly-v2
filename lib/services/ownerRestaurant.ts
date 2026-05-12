import { getSupabase } from '@/lib/supabase/client';
import { DEFAULT_CURRENCY, DEFAULT_TAX_RATE_FALLBACK } from '@/lib/booking/bookingDefaults';

export type OwnerRestaurant = {
  id: string;
  name: string;
  slug: string | null;
  address: string;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  cuisine: string | null;
  description: string | null;
  coverPhotoUrl: string | null;
  logoUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  priceRange: string | null;
  instagram: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePaymentMethodId: string | null;
  billingCardBrand: string | null;
  billingCardLast4: string | null;
  billingCardExpMonth: number | null;
  billingCardExpYear: number | null;
  trialEndsAt: string | null;
  createdAt: string | null;
  timezone: string | null;
  currency: string;
  taxRate: number;
};

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function stringOrNull(value: unknown): string | null {
  const valueString = stringValue(value);
  return valueString || null;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function settings(row: Record<string, unknown>): Record<string, unknown> {
  const raw = row.settings_json;
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
}

// price_range is stored on the live DB as an integer 1..4. Some legacy callers
// also accept a "$".."$$$$" string. Normalize to the dollar-sign string used
// throughout the UI.
function priceRangeToString(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const tier = Math.max(1, Math.min(4, Math.round(value)));
    return '$'.repeat(tier);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\$+$/.test(trimmed)) return trimmed.slice(0, 4);
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed) && parsed > 0) {
      return '$'.repeat(Math.max(1, Math.min(4, Math.round(parsed))));
    }
  }
  return null;
}

export function mapOwnerRestaurantRow(row: Record<string, unknown>): OwnerRestaurant {
  const s = settings(row);
  const name = stringValue(row.name) || stringValue(row.business_name) || 'Your restaurant';
  const expMonth = numberOrNull(row.billing_card_exp_month);
  const expYear = numberOrNull(row.billing_card_exp_year);
  return {
    id: stringValue(row.id),
    name,
    slug: stringOrNull(row.slug),
    address: stringValue(row.address),
    city: stringOrNull(row.city),
    phone: stringOrNull(row.phone) || stringOrNull(row.owner_phone),
    email: stringOrNull(row.email),
    website: stringOrNull(row.website) || stringOrNull(s.website),
    cuisine: stringOrNull(row.cuisine_type) || stringOrNull(s.cuisine),
    description: stringOrNull(row.description) || stringOrNull(s.description),
    coverPhotoUrl:
      stringOrNull(row.cover_image_url) ||
      stringOrNull(row.cover_photo_url) ||
      stringOrNull(row.hero_image_url),
    logoUrl: stringOrNull(row.logo_url),
    rating: numberOrNull(row.avg_rating) ?? numberOrNull(s.avg_rating),
    reviewCount: numberOrNull(row.review_count) ?? numberOrNull(s.total_reviews),
    priceRange: priceRangeToString(row.price_range) ?? priceRangeToString(s.price_range),
    instagram: stringOrNull(row.instagram) || stringOrNull(s.instagram),
    stripeCustomerId: stringOrNull(row.stripe_customer_id),
    stripeSubscriptionId: stringOrNull(row.stripe_subscription_id),
    stripePaymentMethodId: stringOrNull(row.stripe_payment_method_id),
    billingCardBrand: stringOrNull(row.billing_card_brand),
    billingCardLast4: stringOrNull(row.billing_card_last4),
    billingCardExpMonth: expMonth,
    billingCardExpYear: expYear,
    trialEndsAt: stringOrNull(row.trial_ends_at),
    createdAt: stringOrNull(row.created_at),
    timezone: stringOrNull(row.timezone),
    currency: stringValue(row.currency) || DEFAULT_CURRENCY,
    taxRate: numberOrNull(row.tax_rate) ?? DEFAULT_TAX_RATE_FALLBACK,
  };
}

export async function fetchOwnerRestaurants(): Promise<OwnerRestaurant[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];

  // Three live owner-linking paths in the shared web schema:
  //   1. user_profiles.restaurant_id (legacy single-restaurant link the web's
  //      RLS function current_user_owned_restaurant_ids() reads).
  //   2. user_restaurant_roles with role='owner' (multi-restaurant link).
  //   3. restaurants.owner_user_id (added by migration 20260509200000 but not
  //      backfilled; still queried as a tertiary fallback for new signups).
  // We collect IDs from all three paths and dedupe before fetching the rows.
  const idSet = new Set<string>();

  const { data: profileRow } = await supabase
    .from('user_profiles')
    .select('id, restaurant_id, role')
    .eq('auth_user_id', userId)
    .maybeSingle();
  const profile = profileRow as { id?: string; restaurant_id?: string | null; role?: string | null } | null;
  if (profile?.restaurant_id && (profile.role ?? '').toLowerCase().trim() === 'owner') {
    idSet.add(profile.restaurant_id);
  }

  if (profile?.id) {
    const { data: roleRows } = await supabase
      .from('user_restaurant_roles')
      .select('restaurant_id, role')
      .eq('user_id', profile.id);
    for (const row of (roleRows ?? []) as Array<{ restaurant_id?: string | null; role?: string | null }>) {
      if (row.restaurant_id && (row.role ?? '').toLowerCase().trim() === 'owner') {
        idSet.add(row.restaurant_id);
      }
    }
  }

  const { data: ownerColRows } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_user_id', userId);
  for (const row of (ownerColRows ?? []) as Array<{ id?: string | null }>) {
    if (row.id) idSet.add(row.id);
  }

  if (idSet.size === 0) return [];

  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .in('id', Array.from(idSet))
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map(mapOwnerRestaurantRow);
}

export async function fetchCurrentOwnerRestaurant(): Promise<OwnerRestaurant | null> {
  const restaurants = await fetchOwnerRestaurants();
  return restaurants[0] ?? null;
}

export async function getCurrentOwnerRestaurantId(): Promise<string | null> {
  const restaurant = await fetchCurrentOwnerRestaurant();
  return restaurant?.id || null;
}
