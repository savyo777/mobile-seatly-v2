/**
 * Shared Seatly types — aligned with StevenGeorgy/Seatly packages/types and Supabase schema.
 * @see https://github.com/StevenGeorgy/Seatly/blob/main/packages/types/index.ts
 */

export type Role = 'customer' | 'host' | 'waiter' | 'owner' | 'kitchen' | 'admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  restaurantId: string | null;
  avatarUrl: string | null;
}

export interface NavItem {
  href: string;
  label: string;
  roles: Role[];
}

/** Row shape for `public.restaurants` (snake_case). */
export interface RestaurantRow {
  id: string;
  name: string | null;
  slug: string;
  logo_url: string | null;
  cover_photo_url: string | null;
  cuisine_type: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  hours_json: Record<string, unknown> | null;
  settings_json: Record<string, unknown> | null;
  is_active: boolean | null;
  timezone: string | null;
  currency: string | null;
  tax_rate: string | number | null;
  created_at?: string;
}

/** Row shape for `public.reservations`. */
export interface ReservationRow {
  id: string;
  restaurant_id: string;
  guest_id: string;
  table_id: string | null;
  shift_id: string;
  party_size: number;
  reserved_at: string;
  status: string | null;
  source: string | null;
  special_request: string | null;
  occasion: string | null;
  deposit_amount: string | number | null;
  created_at?: string;
}

/** Row shape for `public.orders`. */
export interface OrderRow {
  id: string;
  reservation_id: string;
  restaurant_id: string;
  guest_id: string;
  is_preorder: boolean | null;
  status: string | null;
  subtotal: string | number | null;
  tax_amount: string | number | null;
  tip_amount: string | number | null;
  total_amount: string | number | null;
  created_at?: string;
}
