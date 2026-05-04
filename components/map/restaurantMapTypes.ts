import type { RestaurantWithDistance } from '@/lib/map/mapFilters';

export type MapRegionDelta = {
  latitudeDelta: number;
  longitudeDelta: number;
};

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
  /** Assistant uses Seatly-7 style restaurant-name pills instead of rating/price pins. */
  markerVariant?: 'default' | 'cenaiva';
  /** Automatically move the map to the user when a location fix arrives. */
  autoFocusUserLocation?: boolean;
  /** Include visible restaurant coordinates in the automatic opening focus. */
  autoFocusRestaurants?: boolean;
  /** Maximum number of restaurant coordinates to include in the opening fit. */
  autoFocusMaxRestaurants?: number;
  /** Region span to use for the automatic user-location focus. */
  autoFocusRegionDelta?: MapRegionDelta;
  /** Changes to this value allow the map to auto-focus again. */
  autoFocusResetKey?: string | number;
  /** When a restaurant is selected by the booking UI, fit user + restaurant in view. */
  focusSelectedWithUser?: boolean;
  /** Region span for the recenter button. Defaults to a closer street-level view. */
  recenterRegionDelta?: MapRegionDelta;
  /**
   * Extra bottom inset for floating controls (e.g. recommendation rail above tab bar).
   * Tab screens already sit above the tab bar — do not add tab bar height again.
   */
  contentBottomInset?: number;
};
