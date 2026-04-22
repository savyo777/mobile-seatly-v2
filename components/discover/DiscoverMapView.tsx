import React, { useMemo, useState } from 'react';
import { View, FlatList, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { RestaurantDiscoveryMap } from '@/components/map/RestaurantDiscoveryMap';
import { RestaurantMapDetailSheet } from '@/components/map/RestaurantMapDetailSheet';
import { mockMapRestaurants } from '@/lib/mock/mapRestaurants';
import {
  applyMapFilter,
  DEFAULT_MAP_CENTER,
  type RestaurantWithDistance,
  type MapFilterId,
  withDistances,
} from '@/lib/map/mapFilters';
import { formatDistanceMeters } from '@/lib/map/geo';
import { useLocation } from '@/lib/location/useLocation';
import { createStyles, spacing, borderRadius, typography } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';

const FILTERS: { id: MapFilterId; label: string }[] = [
  { id: 'nearby', label: 'Nearby' },
  { id: 'topRated', label: 'Top rated' },
  { id: 'dateNight', label: 'Date night' },
  { id: 'outdoor', label: 'Outdoor' },
  { id: 'openNow', label: 'Open now' },
];

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
  const styles = useStyles();
  const { lat, lng, locationReady } = useLocation();
  const [filter, setFilter] = useState<MapFilterId>('nearby');
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantWithDistance | null>(null);

  const userCoords = locationReady
    ? { lat, lng }
    : { lat: DEFAULT_MAP_CENTER.latitude, lng: DEFAULT_MAP_CENTER.longitude };

  const restaurantsWithDistance: RestaurantWithDistance[] = useMemo(
    () => withDistances(mockMapRestaurants, userCoords.lat, userCoords.lng),
    [userCoords.lat, userCoords.lng],
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
        userLocation={locationReady ? { latitude: lat, longitude: lng } : null}
        showUserLocation={locationReady}
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
          onAskAi={() => router.push('/(customer)/ai-chat' as any)}
        />
      )}
    </View>
  );
}
