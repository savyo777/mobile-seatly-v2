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
    coverPhotoUrl: stringOrNull(row.hero_image_url) || stringOrNull(row.cover_photo_url),
    logoUrl: stringOrNull(row.logo_url),
    rating: numberOrNull(row.avg_rating) ?? numberOrNull(s.avg_rating),
    reviewCount: numberOrNull(row.review_count) ?? numberOrNull(s.total_reviews),
    priceRange: stringOrNull(row.price_range) || stringOrNull(s.price_range),
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

export async function fetchCurrentOwnerRestaurant(): Promise<OwnerRestaurant | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapOwnerRestaurantRow(data as Record<string, unknown>) : null;
}

export async function getCurrentOwnerRestaurantId(): Promise<string | null> {
  const restaurant = await fetchCurrentOwnerRestaurant();
  return restaurant?.id || null;
}
