import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type MapPressEvent } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RestaurantMapMarkerContent } from '@/components/map/RestaurantMapMarker';
import { googleDarkMapStyle } from '@/lib/map/darkMapStyle';
import { haversineMeters } from '@/lib/map/geo';
import { DEFAULT_MAP_CENTER } from '@/lib/map/mapFilters';
import type { RestaurantDiscoveryMapProps } from '@/components/map/restaurantMapTypes';
import { useColors, useTheme, createStyles, spacing, borderRadius, typography, shadows } from '@/lib/theme';

const DEFAULT_RECENTER_REGION_DELTA = {
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};
const DEFAULT_CLUSTER_RADIUS_METERS = 430;
const CENAIVA_CLUSTER_RADIUS_METERS = 560;

function isFiniteCoordinate(latitude: unknown, longitude: unknown): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

function safeRating(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function safePriceTier(value: number): number {
  return Math.max(1, Math.min(4, Number.isFinite(value) ? value : 1));
}

type ClusterableRestaurant = RestaurantDiscoveryMapProps['filteredRestaurants'][number];
type MarkerCluster = {
  id: string;
  latitude: number;
  longitude: number;
  restaurants: ClusterableRestaurant[];
};

function clusterRestaurants(
  restaurants: ClusterableRestaurant[],
  selectedId: string | null | undefined,
  radiusMeters: number,
): MarkerCluster[] {
  const clusters: MarkerCluster[] = [];

  restaurants.forEach((restaurant) => {
    if (selectedId === restaurant.id) {
      clusters.push({
        id: `single-${restaurant.id}`,
        latitude: restaurant.lat,
        longitude: restaurant.lng,
        restaurants: [restaurant],
      });
      return;
    }

    const existing = clusters.find((cluster) => {
      if (cluster.restaurants.some((item) => item.id === selectedId)) return false;
      return haversineMeters(cluster.latitude, cluster.longitude, restaurant.lat, restaurant.lng) <= radiusMeters;
    });

    if (!existing) {
      clusters.push({
        id: `cluster-${restaurant.id}`,
        latitude: restaurant.lat,
        longitude: restaurant.lng,
        restaurants: [restaurant],
      });
      return;
    }

    existing.restaurants.push(restaurant);
    const count = existing.restaurants.length;
    existing.latitude = existing.restaurants.reduce((sum, item) => sum + item.lat, 0) / count;
    existing.longitude = existing.restaurants.reduce((sum, item) => sum + item.lng, 0) / count;
    existing.id = `cluster-${existing.restaurants.map((item) => item.id).join('-')}`;
  });

  return clusters;
}

const useStyles = createStyles((c) => ({
  mapShell: {
    flex: 1,
    minHeight: 300,
    width: '100%',
    backgroundColor: c.bgBase,
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.bgBase === '#F8F7F4' ? 'rgba(248,247,244,0.72)' : 'rgba(10,10,10,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: c.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySub: {
    ...typography.bodySmall,
    color: c.textSecondary,
    textAlign: 'center',
  },
  locateFab: {
    position: 'absolute',
    right: spacing.md,
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgSurface,
    borderWidth: 1.5,
    borderColor: c.gold,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.goldGlow,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.bgBase === '#F8F7F4' ? 'rgba(248,247,244,0.38)' : 'rgba(10,10,10,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackUserDotOuter: {
    width: 18,
    height: 18,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(59,130,246,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.6)',
  },
  fallbackUserDotInner: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: c.info,
  },
  clusterBubble: {
    minWidth: 48,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 12,
    backgroundColor: c.gold,
    borderWidth: 2,
    borderColor: c.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.goldGlow,
  },
  clusterCount: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
    color: c.bgBase,
  },
  clusterLabel: {
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '800',
    color: c.bgBase,
    textTransform: 'uppercase',
  },
}));

export function RestaurantDiscoveryMap({
  filteredRestaurants,
  selectedId,
  onSelectRestaurant,
  onSelectCluster,
  onMapPress,
  userLocation,
  showUserLocation,
  locationReady,
  markerVariant = 'default',
  autoFocusUserLocation = false,
  autoFocusRestaurants = false,
  autoFocusMaxRestaurants = 8,
  autoFocusRegionDelta,
  autoFocusResetKey,
  focusSelectedWithUser = false,
  recenterRegionDelta = DEFAULT_RECENTER_REGION_DELTA,
  contentBottomInset = 0,
}: RestaurantDiscoveryMapProps) {
  const c = useColors();
  const { effective } = useTheme();
  const styles = useStyles();
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);
  const autoFocusDoneRef = useRef(false);
  const autoFocusResetKeyRef = useRef(autoFocusResetKey);
  const safeUserLocation = useMemo(
    () =>
      userLocation && isFiniteCoordinate(userLocation.latitude, userLocation.longitude)
        ? userLocation
        : null,
    [userLocation],
  );
  const safeRestaurants = useMemo(
    () =>
      filteredRestaurants.filter((restaurant) =>
        isFiniteCoordinate(restaurant.lat, restaurant.lng),
      ),
    [filteredRestaurants],
  );
  const markerClusters = useMemo(
    () =>
      clusterRestaurants(
        safeRestaurants,
        selectedId,
        markerVariant === 'cenaiva' ? CENAIVA_CLUSTER_RADIUS_METERS : DEFAULT_CLUSTER_RADIUS_METERS,
      ),
    [markerVariant, safeRestaurants, selectedId],
  );
  const detailOpen = !!selectedId;
  const selectedRestaurant = selectedId
    ? safeRestaurants.find((restaurant) => restaurant.id === selectedId) ?? null
    : null;

  const recenterOnUser = useCallback(() => {
    if (!safeUserLocation) return;
    mapRef.current?.animateToRegion(
      {
        latitude: safeUserLocation.latitude,
        longitude: safeUserLocation.longitude,
        latitudeDelta: recenterRegionDelta.latitudeDelta,
        longitudeDelta: recenterRegionDelta.longitudeDelta,
      },
      420,
    );
  }, [recenterRegionDelta.latitudeDelta, recenterRegionDelta.longitudeDelta, safeUserLocation]);

  useEffect(() => {
    if (autoFocusResetKeyRef.current !== autoFocusResetKey) {
      autoFocusResetKeyRef.current = autoFocusResetKey;
      autoFocusDoneRef.current = false;
    }
  }, [autoFocusResetKey]);

  useEffect(() => {
    if (!autoFocusUserLocation || autoFocusDoneRef.current || !safeUserLocation) return;
    const focusRestaurants = autoFocusRestaurants
      ? safeRestaurants.slice(0, Math.max(0, autoFocusMaxRestaurants))
      : [];
    if (autoFocusRestaurants && !focusRestaurants.length) return;

    autoFocusDoneRef.current = true;
    const regionDelta = autoFocusRegionDelta ?? DEFAULT_RECENTER_REGION_DELTA;
    const timer = setTimeout(() => {
      if (focusRestaurants.length) {
        mapRef.current?.fitToCoordinates(
          [
            { latitude: safeUserLocation.latitude, longitude: safeUserLocation.longitude },
            ...focusRestaurants.map((restaurant) => ({
              latitude: restaurant.lat,
              longitude: restaurant.lng,
            })),
          ],
          {
            edgePadding: {
              top: 72,
              right: 48,
              bottom: 72 + contentBottomInset,
              left: 48,
            },
            animated: true,
          },
        );
        return;
      }

      mapRef.current?.animateToRegion(
        {
          latitude: safeUserLocation.latitude,
          longitude: safeUserLocation.longitude,
          latitudeDelta: regionDelta.latitudeDelta,
          longitudeDelta: regionDelta.longitudeDelta,
        },
        260,
      );
    }, 80);
    return () => clearTimeout(timer);
  }, [
    autoFocusRegionDelta,
    autoFocusRestaurants,
    autoFocusMaxRestaurants,
    autoFocusResetKey,
    autoFocusUserLocation,
    contentBottomInset,
    safeRestaurants,
    safeUserLocation,
  ]);

  useEffect(() => {
    if (!focusSelectedWithUser || !safeUserLocation || !selectedRestaurant) return;
    const timer = setTimeout(() => {
      const sameCoordinate =
        Math.abs(safeUserLocation.latitude - selectedRestaurant.lat) < 0.00005 &&
        Math.abs(safeUserLocation.longitude - selectedRestaurant.lng) < 0.00005;

      if (sameCoordinate) {
        mapRef.current?.animateToRegion(
          {
            latitude: selectedRestaurant.lat,
            longitude: selectedRestaurant.lng,
            latitudeDelta: 0.014,
            longitudeDelta: 0.014,
          },
          360,
        );
        return;
      }

      mapRef.current?.fitToCoordinates(
        [
          { latitude: safeUserLocation.latitude, longitude: safeUserLocation.longitude },
          { latitude: selectedRestaurant.lat, longitude: selectedRestaurant.lng },
        ],
        {
          edgePadding: {
            top: 84,
            right: 56,
            bottom: 240 + contentBottomInset,
            left: 56,
          },
          animated: true,
        },
      );
    }, 80);

    return () => clearTimeout(timer);
  }, [
    contentBottomInset,
    focusSelectedWithUser,
    selectedRestaurant?.id,
    selectedRestaurant?.lat,
    selectedRestaurant?.lng,
    safeUserLocation?.latitude,
    safeUserLocation?.longitude,
  ]);

  const initialRegion = {
    latitude: autoFocusUserLocation && safeUserLocation ? safeUserLocation.latitude : DEFAULT_MAP_CENTER.latitude,
    longitude: autoFocusUserLocation && safeUserLocation ? safeUserLocation.longitude : DEFAULT_MAP_CENTER.longitude,
    latitudeDelta: autoFocusUserLocation && autoFocusRegionDelta
      ? autoFocusRegionDelta.latitudeDelta
      : DEFAULT_MAP_CENTER.latitudeDelta,
    longitudeDelta: autoFocusUserLocation && autoFocusRegionDelta
      ? autoFocusRegionDelta.longitudeDelta
      : DEFAULT_MAP_CENTER.longitudeDelta,
  };

  const handleMapPress = useCallback(
    (event: MapPressEvent) => {
      const action = event?.nativeEvent?.action;
      if (action === 'marker-press') return;
      onMapPress();
    },
    [onMapPress],
  );

  const focusCluster = useCallback((cluster: MarkerCluster) => {
    if (cluster.restaurants.length <= 1) {
      const restaurant = cluster.restaurants[0];
      if (restaurant) onSelectRestaurant(restaurant.id);
      return;
    }

    onSelectCluster?.(cluster.restaurants);

    mapRef.current?.fitToCoordinates(
      cluster.restaurants.map((restaurant) => ({
        latitude: restaurant.lat,
        longitude: restaurant.lng,
      })),
      {
        edgePadding: {
          top: 84,
          right: 64,
          bottom: 180 + contentBottomInset,
          left: 64,
        },
        animated: true,
      },
    );
  }, [contentBottomInset, onSelectCluster, onSelectRestaurant]);

  return (
    <View style={styles.mapShell}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        userInterfaceStyle={effective}
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        customMapStyle={Platform.OS === 'android' && effective === 'dark' ? googleDarkMapStyle : undefined}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={false}
        showsCompass={false}
        minZoomLevel={3}
        maxZoomLevel={20}
        scrollEnabled
        zoomEnabled
        zoomTapEnabled
        rotateEnabled
        pitchEnabled={false}
        toolbarEnabled={false}
        onPress={handleMapPress}
      >
        {safeUserLocation && !showUserLocation ? (
          <Marker
            key="user-location-fallback"
            coordinate={{
              latitude: safeUserLocation.latitude,
              longitude: safeUserLocation.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.fallbackUserDotOuter}>
              <View style={styles.fallbackUserDotInner} />
            </View>
          </Marker>
        ) : null}

        {markerClusters.map((cluster) => {
          if (cluster.restaurants.length > 1) {
            return (
              <Marker
                key={cluster.id}
                coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
                accessibilityLabel={`${cluster.restaurants.length} restaurants nearby`}
                accessibilityHint="Shows the restaurants in this group"
                accessibilityRole="button"
                anchor={{ x: 0.5, y: 0.5 }}
                zIndex={500}
                onPress={() => focusCluster(cluster)}
                tracksViewChanges={false}
              >
                <View style={styles.clusterBubble}>
                  <Text style={styles.clusterCount}>{cluster.restaurants.length}</Text>
                  <Text style={styles.clusterLabel}>spots</Text>
                </View>
              </Marker>
            );
          }

          const r = cluster.restaurants[0];
          const selected = selectedId === r.id;
          const displayRating = safeRating(r.avgRating);
          const displayPriceTier = safePriceTier(r.priceRange);
          return (
            <Marker
              key={`restaurant-${r.id}`}
              coordinate={{ latitude: r.lat, longitude: r.lng }}
              accessibilityLabel={`${r.name ?? 'Restaurant'}, ${displayRating.toFixed(1)} rating · ${'$'.repeat(displayPriceTier)}`}
              accessibilityHint={markerVariant === 'cenaiva' ? 'Shows restaurant catalog' : undefined}
              accessibilityRole="button"
              anchor={markerVariant === 'cenaiva' ? { x: 0.5, y: 0.36 } : { x: 0.5, y: 1 }}
              zIndex={selected ? 1000 : 1}
              onPress={() => onSelectRestaurant(r.id)}
              tracksViewChanges={selected}
            >
              <RestaurantMapMarkerContent
                name={r.name}
                rating={displayRating}
                priceTier={displayPriceTier}
                selected={selected}
                variant={markerVariant}
              />
            </Marker>
          );
        })}
      </MapView>

      {locationReady && safeRestaurants.length === 0 && (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <Text style={styles.emptyTitle}>{t('mapScreen.noMatchesTitle')}</Text>
          <Text style={styles.emptySub}>{t('mapScreen.noMatchesHint')}</Text>
        </View>
      )}

      {!locationReady && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={c.gold} />
        </View>
      )}

      {locationReady && safeUserLocation ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Recenter on your location"
          onPress={recenterOnUser}
          style={[
            styles.locateFab,
            {
              bottom: (detailOpen ? 200 : spacing.md) + contentBottomInset,
            },
          ]}
        >
          <Ionicons name="locate" size={22} color={c.gold} />
        </Pressable>
      ) : null}
    </View>
  );
}
