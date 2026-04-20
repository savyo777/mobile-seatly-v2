import type { RestaurantRow } from '@cenaiva/types';
import type { DiscoverSectionKey, Restaurant } from '@/lib/mock/restaurants';

function num(v: string | number | null | undefined, fallback: number): number {
  if (v == null) return fallback;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function readSettingsLatLng(settings: Record<string, unknown> | null | undefined): { lat: number; lng: number } {
  if (!settings) return { lat: 43.6532, lng: -79.3832 };
  const lat = settings.lat;
  const lng = settings.lng;
  return {
    lat: typeof lat === 'number' ? lat : 43.6532,
    lng: typeof lng === 'number' ? lng : -79.3832,
  };
}

function hoursFromJson(raw: Record<string, unknown> | null): Restaurant['hoursJson'] {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const out: Restaurant['hoursJson'] = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v && typeof v === 'object' && 'open' in v && 'close' in v) {
      const o = v as { open?: string; close?: string };
      if (typeof o.open === 'string' && typeof o.close === 'string') {
        out[k] = { open: o.open, close: o.close };
      }
    }
  }
  return out;
}

/**
 * Maps a Supabase `restaurants` row to the mobile `Restaurant` UI model.
 * Fills discover-only fields with defaults until DB/marketing JSON provides them.
 */
export function mapRestaurantRowToRestaurant(row: RestaurantRow): Restaurant {
  const settings = row.settings_json as Record<string, unknown> | undefined;
  const { lat, lng } = readSettingsLatLng(settings);

  const area =
    (typeof settings?.neighbourhood === 'string' && settings.neighbourhood) ||
    (typeof settings?.area === 'string' && settings.area) ||
    row.city ||
    '';

  const tags = Array.isArray(settings?.tags) ? (settings!.tags as string[]).filter((t) => typeof t === 'string') : [];

  const featuredIn: DiscoverSectionKey[] = Array.isArray(settings?.featured_in)
    ? ((settings!.featured_in as string[]).filter(Boolean) as DiscoverSectionKey[])
    : ['recommended'];

  const priceRange = typeof settings?.price_range === 'number' && settings.price_range >= 1 && settings.price_range <= 4
    ? (settings.price_range as 1 | 2 | 3 | 4)
    : 2;

  const availability = (settings?.availability as Restaurant['availability']) ?? 'Popular';

  return {
    id: row.id,
    name: row.name ?? 'Restaurant',
    slug: row.slug,
    cuisineType: row.cuisine_type ?? '',
    description: row.description ?? '',
    address: row.address ?? '',
    city: row.city ?? '',
    province: row.province ?? '',
    area,
    lat,
    lng,
    phone: row.phone ?? '',
    coverPhotoUrl: row.cover_photo_url ?? '',
    logoUrl: row.logo_url ?? '',
    avgRating: num(settings?.avg_rating as number | undefined, 4.5),
    totalReviews: typeof settings?.total_reviews === 'number' ? settings!.total_reviews : 0,
    priceRange,
    distanceKm: typeof settings?.distance_km === 'number' ? settings!.distance_km : 1,
    availability,
    ambiance: typeof settings?.ambiance === 'string' ? settings.ambiance : '',
    tags: tags.length ? tags : ['Dining'],
    featuredIn: featuredIn.length ? featuredIn : ['recommended'],
    isActive: row.is_active ?? true,
    hoursJson: hoursFromJson(row.hours_json as Record<string, unknown> | null),
    taxRate: num(row.tax_rate, 0.13),
    currency: row.currency ?? 'CAD',
  };
}
