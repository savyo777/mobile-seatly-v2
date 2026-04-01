import type { RestaurantWithDistance } from '@/lib/map/mapFilters';

export type RestaurantDiscoveryMapProps = {
  filteredRestaurants: RestaurantWithDistance[];
  selectedId: string | null;
  onSelectRestaurant: (id: string) => void;
  onMapPress: () => void;
  /** User GPS when permission granted; otherwise null (map uses default region). */
  userLocation: { latitude: number; longitude: number } | null;
  showUserLocation: boolean;
  /** False while resolving permission / first fix; avoids infinite loading UI. */
  locationReady: boolean;
  /**
   * Extra bottom inset for floating controls (e.g. recommendation rail above tab bar).
   * Tab screens already sit above the tab bar — do not add tab bar height again.
   */
  contentBottomInset?: number;
};
