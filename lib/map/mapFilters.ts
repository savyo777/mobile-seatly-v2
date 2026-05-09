import type { Restaurant } from '@/lib/mock/restaurants';
import { haversineMeters } from '@/lib/map/geo';
import { isRestaurantOpenNow } from '@/lib/map/hours';

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

export function applyMapFilter(
  items: RestaurantWithDistance[],
  filter: MapFilterId,
  now: Date = new Date(),
): RestaurantWithDistance[] {
  const active = items.filter((r) => r.isActive);

  switch (filter) {
    case 'nearby':
      return [...active].sort((a, b) => a.distanceMeters - b.distanceMeters);
    case 'topRated': {
      const list = active.filter((r) => (r.avgRating ?? 0) >= 4.6 || r.availability === 'Top Rated');
      return [...list].sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0) || a.distanceMeters - b.distanceMeters);
    }
    case 'dateNight': {
      const list = active.filter(hasDateNightSignals);
      return [...list].sort((a, b) => a.distanceMeters - b.distanceMeters);
    }
    case 'outdoor': {
      const list = active.filter(hasOutdoorSignals);
      return [...list].sort((a, b) => a.distanceMeters - b.distanceMeters);
    }
    case 'openNow': {
      const list = active.filter((r) => isRestaurantOpenNow(r, now));
      return [...list].sort((a, b) => a.distanceMeters - b.distanceMeters);
    }
    case 'availableTonight': {
      const list = active.filter((r) => r.availability === 'Available Tonight');
      return [...list].sort((a, b) => a.distanceMeters - b.distanceMeters);
    }
    default:
      return [...active].sort((a, b) => a.distanceMeters - b.distanceMeters);
  }
}
