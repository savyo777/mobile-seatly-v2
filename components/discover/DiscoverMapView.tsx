import React, { useMemo, useState } from 'react';
import { View, FlatList, Pressable, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { RestaurantDiscoveryMap } from '@/components/map/RestaurantDiscoveryMap';
import { RestaurantMapDetailSheet } from '@/components/map/RestaurantMapDetailSheet';
import { mockMapRestaurants } from '@/lib/mock/mapRestaurants';
import {
  applyMapFilter,
  DEFAULT_MAP_CENTER,
  isMapLocationInDemoRegion,
  type RestaurantWithDistance,
  type MapFilterId,
  withDistances,
} from '@/lib/map/mapFilters';
import { useLocation } from '@/lib/location/useLocation';
import { createStyles, spacing, borderRadius, typography, useColors } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useCenaivaAssistant } from '@/lib/cenaiva/CenaivaAssistantProvider';

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
  clusterSheet: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  clusterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  clusterTitle: {
    ...typography.h3,
    color: c.textPrimary,
  },
  clusterClose: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  clusterList: {
    maxHeight: 220,
  },
  clusterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  clusterPin: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(201,168,76,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterInfo: {
    flex: 1,
    minWidth: 0,
  },
  clusterName: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  clusterMeta: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginTop: 2,
  },
  clusterAction: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '800',
  },
}));

export function DiscoverMapView() {
  const router = useRouter();
  const assistant = useCenaivaAssistant();
  const c = useColors();
  const styles = useStyles();
  const { lat, lng, locationReady, permissionDenied, source } = useLocation();
  const [filter, setFilter] = useState<MapFilterId>('nearby');
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantWithDistance | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<RestaurantWithDistance[] | null>(null);

  const hasReliableUserLocation =
    locationReady && !permissionDenied && source === 'live' && isMapLocationInDemoRegion(lat, lng);
  const userCoords = hasReliableUserLocation
    ? { lat, lng }
    : { lat: DEFAULT_MAP_CENTER.latitude, lng: DEFAULT_MAP_CENTER.longitude };

  const restaurantsWithDistance: RestaurantWithDistance[] = useMemo(
    () => withDistances(mockMapRestaurants, userCoords.lat, userCoords.lng, {
      distanceAvailable: hasReliableUserLocation,
    }),
    [hasReliableUserLocation, userCoords.lat, userCoords.lng],
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
          setSelectedCluster(null);
          setSelectedRestaurant(r);
        }}
        onSelectCluster={(restaurants) => {
          setFocusedId(null);
          setSelectedRestaurant(null);
          setSelectedCluster(restaurants);
        }}
        onMapPress={() => {
          setFocusedId(null);
          setSelectedRestaurant(null);
          setSelectedCluster(null);
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

      {selectedCluster && selectedCluster.length > 1 ? (
        <View style={styles.clusterSheet}>
          <View style={styles.clusterHeader}>
            <Text style={styles.clusterTitle}>{selectedCluster.length} spots nearby</Text>
            <Pressable
              onPress={() => setSelectedCluster(null)}
              style={styles.clusterClose}
              accessibilityRole="button"
              accessibilityLabel="Close nearby spots"
            >
              <Ionicons name="close" size={18} color={c.textPrimary} />
            </Pressable>
          </View>
          <ScrollView style={styles.clusterList} showsVerticalScrollIndicator={false}>
            {selectedCluster.map((restaurant) => (
              <Pressable
                key={restaurant.id}
                onPress={() => {
                  setFocusedId(restaurant.id);
                  setSelectedRestaurant(restaurant);
                  setSelectedCluster(null);
                }}
                style={({ pressed }) => [styles.clusterRow, pressed && { opacity: 0.74 }]}
                accessibilityRole="button"
              >
                <View style={styles.clusterPin}>
                  <Ionicons name="restaurant-outline" size={17} color={c.gold} />
                </View>
                <View style={styles.clusterInfo}>
                  <Text style={styles.clusterName} numberOfLines={1}>{restaurant.name}</Text>
                  <Text style={styles.clusterMeta} numberOfLines={1}>
                    {restaurant.cuisineType} · {restaurant.area} · {restaurant.avgRating.toFixed(1)}
                  </Text>
                </View>
                <Text style={styles.clusterAction}>Open</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
