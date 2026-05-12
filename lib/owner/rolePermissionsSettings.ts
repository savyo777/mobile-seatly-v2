import type { Ionicons } from '@expo/vector-icons';
import { getSupabase } from '@/lib/supabase/client';

export type RoleId = 'manager' | 'host' | 'server' | 'kitchen';

export type Role = {
  id: RoleId;
  name: string;
  blurb: string;
  count: number;
};

export type Permission = {
  key: string;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

/** role-id → permission-key → boolean */
export type RolePermissionMatrix = Record<string, Record<string, boolean>>;

export const ROLES: Role[] = [
  { id: 'manager', name: 'Manager', blurb: 'Runs the floor and the back-office.', count: 1 },
  { id: 'host', name: 'Host', blurb: 'Greets guests and seats tables.', count: 1 },
  { id: 'server', name: 'Server', blurb: 'Takes orders and runs payments.', count: 1 },
  { id: 'kitchen', name: 'Kitchen', blurb: 'Sees orders, marks dishes ready.', count: 1 },
];

export const PERMISSIONS: Permission[] = [
  { key: 'reservations', label: 'View and edit reservations', description: 'See bookings, change times, seat guests.', icon: 'calendar-outline' },
  { key: 'guests', label: 'Access guest CRM', description: 'View guest profiles, notes, and history.', icon: 'people-outline' },
  { key: 'menu', label: 'Edit the menu', description: 'Add, hide, or change dishes and prices.', icon: 'restaurant-outline' },
  { key: 'promos', label: 'Create promotions', description: 'Launch and edit deals or offers.', icon: 'pricetag-outline' },
  { key: 'payouts', label: 'See payouts & billing', description: 'View revenue, invoices, payment methods.', icon: 'card-outline' },
  { key: 'staff', label: 'Manage team', description: 'Invite or remove staff members.', icon: 'shield-checkmark-outline' },
];

export const DEFAULT_PERMS: RolePermissionMatrix = {
  manager: { reservations: true, guests: true, menu: true, promos: true, payouts: true, staff: true },
  host: { reservations: true, guests: true, menu: false, promos: false, payouts: false, staff: false },
  server: { reservations: true, guests: true, menu: false, promos: false, payouts: false, staff: false },
  kitchen: { reservations: false, guests: false, menu: true, promos: false, payouts: false, staff: false },
};

const SETTINGS_KEY = 'role_permissions';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Merge a persisted (possibly partial) matrix with `DEFAULT_PERMS` so that newly
 * added roles or permission keys are filled in with sensible defaults. Unknown
 * roles/keys from the saved value are dropped.
 */
export function mergeWithDefaults(
  saved: unknown,
  defaults: RolePermissionMatrix = DEFAULT_PERMS,
): RolePermissionMatrix {
  const result: RolePermissionMatrix = {};
  const savedObj = isPlainObject(saved) ? saved : {};
  for (const roleId of Object.keys(defaults)) {
    const defaultsForRole = defaults[roleId] ?? {};
    const savedForRoleRaw = savedObj[roleId];
    const savedForRole = isPlainObject(savedForRoleRaw) ? savedForRoleRaw : {};
    const merged: Record<string, boolean> = {};
    for (const permKey of Object.keys(defaultsForRole)) {
      const savedVal = savedForRole[permKey];
      merged[permKey] =
        typeof savedVal === 'boolean' ? savedVal : !!defaultsForRole[permKey];
    }
    result[roleId] = merged;
  }
  return result;
}

/**
 * Read the role × permission matrix from `restaurants.settings_json.role_permissions`.
 * Always merged with `DEFAULT_PERMS` so callers can render without null-checks.
 */
export async function readRolePermissions(
  restaurantId: string,
): Promise<RolePermissionMatrix> {
  const supabase = getSupabase();
  if (!supabase || !restaurantId) return mergeWithDefaults(null);

  const { data, error } = await supabase
    .from('restaurants')
    .select('settings_json')
    .eq('id', restaurantId)
    .maybeSingle();
  if (error) throw error;

  const settings = isPlainObject(data?.settings_json) ? (data!.settings_json as Record<string, unknown>) : {};
  return mergeWithDefaults(settings[SETTINGS_KEY]);
}

/**
 * Write the matrix to `restaurants.settings_json.role_permissions`, preserving
 * any other settings already in the JSON column.
 */
export async function writeRolePermissions(
  restaurantId: string,
  value: RolePermissionMatrix,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !restaurantId) return;

  const { data, error: readError } = await supabase
    .from('restaurants')
    .select('settings_json')
    .eq('id', restaurantId)
    .maybeSingle();
  if (readError) throw readError;

  const current = isPlainObject(data?.settings_json) ? (data!.settings_json as Record<string, unknown>) : {};
  const next = { ...current, [SETTINGS_KEY]: value };

  const { error: writeError } = await supabase
    .from('restaurants')
    .update({ settings_json: next })
    .eq('id', restaurantId);
  if (writeError) throw writeError;
}
