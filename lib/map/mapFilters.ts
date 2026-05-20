import type { Restaurant } from '@/lib/mock/restaurants';
import { haversineMeters } from '@/lib/map/geo';
import { isRestaurantOpenNow } from '@/lib/map/hours';
import { normalizeRestaurantPriceRange } from '@/lib/restaurants/pricing';

export type MapFilterId =
  | 'nearby'
  | 'topRated'
  | 'dateNight'
  | 'outdoor'
  | 'openNow'
  | 'availableTonight';

export type RestaurantWithDistance = Restaurant & { distanceMeters: number };

const DEMO_MAP_LOCATION_RADIUS_METERS = 100_000;

// Initial map center used when the user denies location permission. Defaults
// to GTA coordinates (Cenaiva's launch market), but every component reads
// from EXPO_PUBLIC_DEFAULT_MAP_* so it can be retargeted per build.
function envNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (typeof raw !== 'string') return fallback;
  const parsed = Number(raw.trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const DEFAULT_MAP_CENTER = {
  latitude: envNumber('EXPO_PUBLIC_DEFAULT_MAP_LAT', 43.51025),
  longitude: envNumber('EXPO_PUBLIC_DEFAULT_MAP_LON', -79.86635),
  latitudeDelta: envNumber('EXPO_PUBLIC_DEFAULT_MAP_DELTA', 0.022),
  longitudeDelta: envNumber('EXPO_PUBLIC_DEFAULT_MAP_DELTA', 0.022),
};

export function isMapLocationInDemoRegion(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    haversineMeters(DEFAULT_MAP_CENTER.latitude, DEFAULT_MAP_CENTER.longitude, lat, lng) <=
      DEMO_MAP_LOCATION_RADIUS_METERS
  );
}

export function withDistances(
  restaurants: Restaurant[],
  userLat: number,
  userLng: number,
  options: { distanceAvailable?: boolean } = {},
): RestaurantWithDistance[] {
  const distanceAvailable = options.distanceAvailable ?? true;
  return restaurants.map((r) => ({
    ...r,
    distanceMeters: distanceAvailable && r.lat != null && r.lng != null
      ? haversineMeters(userLat, userLng, r.lat, r.lng)
      : Number.POSITIVE_INFINITY,
  }));
}

function hasOutdoorSignals(r: Restaurant): boolean {
  if (r.featuredIn.includes('outdoor-seating')) return true;
  const blob = `${r.tags.join(' ')} ${r.ambiance} ${r.description}`.toLowerCase();
  return /outdoor|patio|terrace|garden|rooftop|open-air/.test(blob);
}

function hasDateNightSignals(r: Restaurant): boolean {
  if (r.featuredIn.includes('date-night-picks')) return true;
  return r.tags.some((t) => /date|romantic|candle|intimate/i.test(t));
}

function byDistance(a: RestaurantWithDistance, b: RestaurantWithDistance): number {
  return a.distanceMeters - b.distanceMeters;
}

function byRatingThenDistance(a: RestaurantWithDistance, b: RestaurantWithDistance): number {
  return (b.avgRating ?? 0) - (a.avgRating ?? 0) || a.distanceMeters - b.distanceMeters;
}

export function applyMapFilter(
  items: RestaurantWithDistance[],
  filter: MapFilterId,
  now: Date = new Date(),
): RestaurantWithDistance[] {
  const active = items.filter((r) => r.isActive);

  switch (filter) {
    case 'nearby':
      return [...active].sort(byDistance);

    case 'topRated': {
      // Spec is `avgRating >= 4.6 || availability === 'Top Rated'`, but real
      // Supabase data ships with `availability=null` and only a few rows ever
      // accumulate a 4.6+ rating. The strict cut produced a one-marker list
      // (Mark Testing at 5.0, 26km off-screen) and the user saw a blank map.
      // Practical definition for early-stage data: "any restaurant with at
      // least one review that rated it 3.5+". Surfaces every venue that
      // earned a positive review, sorted highest-first. If literally nothing
      // has a real rating yet, return empty so the empty-state overlay can
      // explain why.
      const list = active.filter(
        (r) =>
          r.availability === 'Top Rated' ||
          ((r.avgRating ?? 0) >= 3.5 && (r.totalReviews ?? 0) > 0),
      );
      return [...list].sort(byRatingThenDistance);
    }

    case 'dateNight': {
      // Strict: tag/featured signals from the Discover catalog. When sparse data
      // means no restaurant carries those signals, fall back to "premium price tier"
      // (priceRange >= 3) which is the strongest signal in raw Supabase rows.
      const strict = active.filter(hasDateNightSignals);
      if (strict.length > 0) return [...strict].sort(byDistance);
      const premium = active.filter((r) => normalizeRestaurantPriceRange(r.priceRange) >= 3);
      return [...premium].sort(byDistance);
    }

    case 'outdoor': {
      // No fallback — outdoor seating is a binary feature. Letting the empty
      // overlay explain "no matches" is more honest than showing indoor
      // restaurants under the "Outdoor" filter.
      const list = active.filter(hasOutdoorSignals);
      return [...list].sort(byDistance);
    }

    case 'openNow': {
      // Restaurants with no hours configured return false from
      // isRestaurantOpenForHours. Treat missing-hours as unknown rather than
      // closed: surface the row but downrank it after the confirmed-open ones,
      // so the user still sees something and isn't penalizing owners who
      // haven't filled in hours yet.
      const open: RestaurantWithDistance[] = [];
      const unknown: RestaurantWithDistance[] = [];
      const hoursEmpty = (r: Restaurant) =>
        !r.hoursJson || Object.keys(r.hoursJson).length === 0;
      for (const r of active) {
        if (hoursEmpty(r)) unknown.push(r);
        else if (isRestaurantOpenNow(r, now)) open.push(r);
      }
      return [...open.sort(byDistance), ...unknown.sort(byDistance)];
    }

    case 'availableTonight': {
      const list = active.filter((r) => r.availability === 'Available Tonight');
      return [...list].sort(byDistance);
    }

    default:
      return [...active].sort(byDistance);
  }
}
