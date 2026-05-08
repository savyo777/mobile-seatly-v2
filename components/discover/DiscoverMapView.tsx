import React, { useEffect, useMemo, useState } from 'react';
import { View, FlatList, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { RestaurantDiscoveryMap } from '@/components/map/RestaurantDiscoveryMap';
import { RestaurantMapDetailSheet } from '@/components/map/RestaurantMapDetailSheet';
import type { Restaurant } from '@/lib/mock/restaurants';
import { mockMapRestaurants } from '@/lib/mock/mapRestaurants';
import { loadRestaurantsForDiscover } from '@/lib/data/restaurantCatalog';
import {
  applyMapFilter,
  DEFAULT_MAP_CENTER,
  isMapLocationInDemoRegion,
  type RestaurantWithDistance,
  type MapFilterId,
  withDistances,
} from '@/lib/map/mapFilters';
import { haversineMeters } from '@/lib/map/geo';
import { useLocation } from '@/lib/location/useLocation';
import { createStyles, spacing, borderRadius, typography } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useCenaivaAssistant } from '@/lib/cenaiva/CenaivaAssistantProvider';

const FILTERS: { id: MapFilterId; label: string }[] = [
  { id: 'nearby', label: 'Nearby' },
  { id: 'topRated', label: 'Top rated' },
  { id: 'dateNight', label: 'Date night' },
  { id: 'outdoor', label: 'Outdoor' },
  { id: 'openNow', label: 'Open now' },
];

const MAP_COORDINATE_RADIUS_METERS = 100_000;

function isFiniteLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

function normalizeRestaurantKey(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const mapFallbackById = new Map(mockMapRestaurants.map((restaurant) => [restaurant.id, restaurant]));
const mapFallbackByName = new Map(
  mockMapRestaurants.map((restaurant) => [normalizeRestaurantKey(restaurant.name), restaurant]),
);

function withMapDisplayCoordinates(
  restaurant: Restaurant,
  anchor: { lat: number; lng: number },
  index: number,
): Restaurant {
  const safeAnchor = isFiniteLatLng(anchor.lat, anchor.lng)
    ? anchor
    : { lat: DEFAULT_MAP_CENTER.latitude, lng: DEFAULT_MAP_CENTER.longitude };

  if (
    isFiniteLatLng(restaurant.lat, restaurant.lng) &&
    haversineMeters(safeAnchor.lat, safeAnchor.lng, restaurant.lat, restaurant.lng) <= MAP_COORDINATE_RADIUS_METERS
  ) {
    return restaurant;
  }

  const fallbackRestaurant =
    mapFallbackById.get(restaurant.id) ??
    mapFallbackByName.get(normalizeRestaurantKey(restaurant.name)) ??
    (mockMapRestaurants.length ? mockMapRestaurants[index % mockMapRestaurants.length] : null);

  if (!fallbackRestaurant || !isFiniteLatLng(fallbackRestaurant.lat, fallbackRestaurant.lng)) {
    return { ...restaurant, lat: safeAnchor.lat, lng: safeAnchor.lng };
  }

  const lat = safeAnchor.lat + (fallbackRestaurant.lat - DEFAULT_MAP_CENTER.latitude);
  const lng = safeAnchor.lng + (fallbackRestaurant.lng - DEFAULT_MAP_CENTER.longitude);
  return {
    ...restaurant,
    lat: isFiniteLatLng(lat, lng) ? lat : safeAnchor.lat,
    lng: isFiniteLatLng(lat, lng) ? lng : safeAnchor.lng,
  };
}

const useStyles = createStyles((c) => ({
  container: {
    flex: 1,
  },
  filtersWrap: {
    position: 'absolute',
    top: spacing.md,
    left: 0,
    right: 0,
  },
  filterRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgSurface,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipActive: {
    backgroundColor: c.gold,
    borderColor: c.gold,
  },
  chipLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: c.textSecondary,
  },
  chipLabelActive: {
    color: c.bgBase,
  },
}));

export function DiscoverMapView() {
  const router = useRouter();
  const assistant = useCenaivaAssistant();
  const styles = useStyles();
  const { lat, lng, locationReady, permissionDenied, source } = useLocation();
  const [filter, setFilter] = useState<MapFilterId>('nearby');
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantWithDistance | null>(null);
  const [sourceRestaurants, setSourceRestaurants] = useState<Restaurant[]>(mockMapRestaurants);

  const hasReliableUserLocation =
    locationReady && !permissionDenied && source === 'live' && isMapLocationInDemoRegion(lat, lng);
  const userCoords = hasReliableUserLocation
    ? { lat, lng }
    : { lat: DEFAULT_MAP_CENTER.latitude, lng: DEFAULT_MAP_CENTER.longitude };

  useEffect(() => {
    let cancelled = false;
    loadRestaurantsForDiscover()
      .then(({ list }) => {
        if (!cancelled) setSourceRestaurants(list.length ? list : mockMapRestaurants);
      })
      .catch(() => {
        if (!cancelled) setSourceRestaurants(mockMapRestaurants);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const mapRestaurants = useMemo(
    () =>
      sourceRestaurants.map((restaurant, index) =>
        withMapDisplayCoordinates(restaurant, userCoords, index),
      ),
    [sourceRestaurants, userCoords.lat, userCoords.lng],
  );

  const restaurantsWithDistance: RestaurantWithDistance[] = useMemo(
    () => withDistances(mapRestaurants, userCoords.lat, userCoords.lng, {
      distanceAvailable: hasReliableUserLocation,
    }),
    [hasReliableUserLocation, mapRestaurants, userCoords.lat, userCoords.lng],
  );

  const filtered = useMemo(
    () => applyMapFilter(restaurantsWithDistance, filter),
    [restaurantsWithDistance, filter],
  );

  return (
    <View style={styles.container}>
      <RestaurantDiscoveryMap
        filteredRestaurants={filtered}
        selectedId={focusedId}
        onSelectRestaurant={(id) => {
          setFocusedId(id);
          const r = filtered.find((x) => x.id === id) ?? null;
          setSelectedRestaurant(r);
        }}
        onMapPress={() => {
          setFocusedId(null);
          setSelectedRestaurant(null);
        }}
        userLocation={hasReliableUserLocation ? { latitude: lat, longitude: lng } : null}
        showUserLocation={hasReliableUserLocation}
        locationReady={locationReady}
        contentBottomInset={180}
      />

      {/* Filter chips */}
      <View style={styles.filtersWrap}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(f) => f.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => {
            const active = filter === item.id;
            return (
              <Pressable
                onPress={() => setFilter(item.id)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{item.label}</Text>
              </Pressable>
            );
          }}
        />
      </View>

      {selectedRestaurant && (
        <RestaurantMapDetailSheet
          restaurant={selectedRestaurant}
          onDismiss={() => setSelectedRestaurant(null)}
          onBook={() => router.push(`/booking/${selectedRestaurant.id}/step1-date` as any)}
          onViewDetails={() => router.push(`/(customer)/discover/${selectedRestaurant.id}` as any)}
          onAskAi={() => {
            assistant.open(selectedRestaurant.id, selectedRestaurant.name);
            setSelectedRestaurant(null);
          }}
        />
      )}
    </View>
  );
}
