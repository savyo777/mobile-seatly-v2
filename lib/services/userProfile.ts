import type { User } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';

export type AppUserProfile = {
  id: string;
  authUserId: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  role: string | null;
  restaurantId: string | null;
  createdAt: string | null;
  loyaltyPointsBalance: number;
  loyaltyTier: string | null;
  city: string | null;
  locationLabel: string | null;
  preferredCuisines: string[];
  dietaryRestrictions: string[];
  diningVibes: string[];
};

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function stringOrNull(value: unknown): string | null {
  const next = stringValue(value);
  return next || null;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function firstStringArray(...values: unknown[]): string[] {
  for (const value of values) {
    const next = stringArray(value);
    if (next.length) return next;
  }
  return [];
}

function numberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function authFallbackName(user: User | null): string {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  return (
    stringValue(meta.full_name) ||
    stringValue(meta.name) ||
    stringValue(user?.email).split('@')[0] ||
    stringValue(user?.phone) ||
    'User'
  );
}

function mapProfileRow(row: Record<string, unknown> | null | undefined, user: User | null): AppUserProfile {
  return {
    id: stringValue(row?.id),
    authUserId: stringValue(row?.auth_user_id) || user?.id || '',
    fullName: stringValue(row?.full_name) || authFallbackName(user),
    email: stringValue(row?.email) || stringValue(user?.email),
    phone: stringValue(row?.phone) || stringValue(user?.phone),
    avatarUrl: stringOrNull(row?.avatar_url),
    role: stringOrNull(row?.role),
    restaurantId: stringOrNull(row?.restaurant_id),
    createdAt: stringOrNull(row?.created_at) || user?.created_at || null,
    loyaltyPointsBalance: numberValue(row?.loyalty_points_balance),
    loyaltyTier: stringOrNull(row?.loyalty_tier),
    city: stringOrNull(row?.city),
    locationLabel:
      stringOrNull(row?.location_label) ||
      stringOrNull(row?.neighbourhood) ||
      stringOrNull(row?.city),
    preferredCuisines: firstStringArray(row?.preferred_cuisines, row?.favorite_cuisines),
    dietaryRestrictions: stringArray(row?.dietary_restrictions),
    diningVibes: stringArray(row?.dining_vibes),
  };
}

export async function fetchCurrentUserProfile(): Promise<AppUserProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user ?? null;
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return mapProfileRow((data ?? null) as Record<string, unknown> | null, user);
}

export async function getCurrentUserProfileId(): Promise<string | null> {
  const profile = await fetchCurrentUserProfile();
  return profile?.id || null;
}

export type UserProfileUpdate = Partial<{
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  preferred_locale: string | null;
  preferred_language: string | null;
  notification_preferences_json: Record<string, unknown> | null;
  birthday: string | null;
  dietary_restrictions: string[] | null;
  allergies: string[] | null;
  seating_preference: string | null;
  noise_preference: string | null;
  car_details_json: Record<string, unknown> | null;
}>;

export async function updateCurrentUserProfile(
  patch: UserProfileUpdate,
): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { error: 'supabase_not_configured' };

  const { data: userData } = await supabase.auth.getUser();
  const authUserId = userData.user?.id;
  if (!authUserId) return { error: 'not_signed_in' };

  const { error } = await supabase
    .from('user_profiles')
    .update(patch)
    .eq('auth_user_id', authUserId);

  return { error: error?.message ?? null };
}

export async function fetchUserProfileNotificationPrefs(): Promise<Record<string, boolean>> {
  const supabase = getSupabase();
  if (!supabase) return {};

  const { data: userData } = await supabase.auth.getUser();
  const authUserId = userData.user?.id;
  if (!authUserId) return {};

  const { data, error } = await supabase
    .from('user_profiles')
    .select('notification_preferences_json')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (error) return {};

  const raw = (data?.notification_preferences_json ?? {}) as Record<string, unknown>;
  const out: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'boolean') out[key] = value;
  }
  return out;
}
