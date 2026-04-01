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

export const DEFAULT_MAP_CENTER = {
  latitude: 43.51025,
  longitude: -79.86635,
  latitudeDelta: 0.022,
  longitudeDelta: 0.022,
};

export function withDistances(
  restaurants: Restaurant[],
  userLat: number,
  userLng: number,
): RestaurantWithDistance[] {
  return restaurants.map((r) => ({
    ...r,
    distanceMeters: haversineMeters(userLat, userLng, r.lat, r.lng),
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
      const list = active.filter((r) => r.avgRating >= 4.6 || r.availability === 'Top Rated');
      return [...list].sort((a, b) => b.avgRating - a.avgRating || a.distanceMeters - b.distanceMeters);
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
