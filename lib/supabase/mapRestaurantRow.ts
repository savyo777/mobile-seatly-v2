import type { RestaurantRow } from '@cenaiva/types';
import {
  RESTAURANT_WEEKDAY_KEYS,
  type DiscoverSectionKey,
  type Restaurant,
  type RestaurantHoursJson,
  type RestaurantSpecialHours,
  type RestaurantWeekdayKey,
} from '@/lib/mock/restaurants';

const DEFAULT_RESTAURANT_COVER = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200';

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

function clampPriceRange(value: unknown, fallback: 1 | 2 | 3 | 4 = 2): 1 | 2 | 3 | 4 {
  const parsed = num(value as string | number | null | undefined, fallback);
  if (parsed >= 4) return 4;
  if (parsed >= 3) return 3;
  if (parsed >= 2) return 2;
  if (parsed >= 1) return 1;
  return fallback;
}

const WEEKDAY_SET = new Set<string>(RESTAURANT_WEEKDAY_KEYS);

function readSpecialHours(raw: unknown): RestaurantSpecialHours[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const s = entry as Record<string, unknown>;
    const date = typeof s.date === 'string' ? s.date : '';
    if (!date) return [];
    return [{
      date,
      closed: s.closed === true,
      from: typeof s.from === 'string' ? s.from : undefined,
      to: typeof s.to === 'string' ? s.to : undefined,
      open: typeof s.open === 'string' ? s.open : undefined,
      close: typeof s.close === 'string' ? s.close : undefined,
    }];
  });
}

function hoursFromJson(raw: Record<string, unknown> | null): RestaurantHoursJson {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const out: RestaurantHoursJson = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k === 'special') {
      const special = readSpecialHours(v);
      if (special.length) out.special = special;
      continue;
    }
    if (!WEEKDAY_SET.has(k)) continue;
    if (v == null) {
      out[k as RestaurantWeekdayKey] = null;
      continue;
    }
    if (v && typeof v === 'object' && 'open' in v && 'close' in v) {
      const o = v as { open?: string; close?: string };
      if (typeof o.open === 'string' && typeof o.close === 'string') {
        out[k as RestaurantWeekdayKey] = { open: o.open, close: o.close };
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
  const fallbackLatLng = readSettingsLatLng(settings);
  const lat = num(row.lat, fallbackLatLng.lat);
  const lng = num(row.lng, fallbackLatLng.lng);

  const area =
    (typeof settings?.neighbourhood === 'string' && settings.neighbourhood) ||
    (typeof settings?.area === 'string' && settings.area) ||
    row.city ||
    '';

  const tags = Array.isArray(settings?.tags) ? (settings!.tags as string[]).filter((t) => typeof t === 'string') : [];

  const featuredIn: DiscoverSectionKey[] = Array.isArray(settings?.featured_in)
    ? ((settings!.featured_in as string[]).filter(Boolean) as DiscoverSectionKey[])
    : ['recommended'];

  const priceRange = clampPriceRange(row.price_range ?? settings?.price_range);

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
    coverPhotoUrl: row.hero_image_url?.trim() || row.cover_photo_url?.trim() || DEFAULT_RESTAURANT_COVER,
    logoUrl: row.logo_url?.trim() || '',
    avgRating: num(row.avg_rating ?? (settings?.avg_rating as number | undefined), 4.5),
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
