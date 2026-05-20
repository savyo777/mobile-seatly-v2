import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type MapPressEvent, type Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RestaurantMapMarkerContent, MARKER_ANCHOR_Y } from '@/components/map/RestaurantMapMarker';
import { RestaurantClusterMarker } from '@/components/map/RestaurantClusterMarker';
import { UseMyLocationChip } from '@/components/map/UseMyLocationChip';
import { CENAIVA_MAP_STYLE } from '@/lib/map/darkMapStyle';
import { hasFiniteCoords, haversineMeters } from '@/lib/map/geo';
import { DEFAULT_MAP_CENTER } from '@/lib/map/mapFilters';
import { normalizeRestaurantPriceRange } from '@/lib/restaurants/pricing';
import type { RestaurantDiscoveryMapProps } from '@/components/map/restaurantMapTypes';
import { useColors, createStyles, spacing, borderRadius, typography, shadows } from '@/lib/theme';

const DEFAULT_RECENTER_REGION_DELTA = {
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};
const DEFAULT_CLUSTER_RADIUS_METERS = 430;
const CENAIVA_CLUSTER_RADIUS_METERS = 560;
const MIN_CLUSTER_RADIUS_METERS = 28;
const CLUSTER_RADIUS_VISIBLE_SPAN_RATIO = 0.24;

// Guardrails to prevent the user from zooming out so far that the map view
// becomes degenerate (latitudeDelta near 180 / longitudeDelta near 360).
// react-native-maps gestures freeze on iOS Apple Maps when the region exits a
// sane range, so we snap back if onRegionChangeComplete reports anything past
// these thresholds.
const MAX_SAFE_LATITUDE_DELTA = 90;
const MAX_SAFE_LONGITUDE_DELTA = 160;
const ZOOM_OUT_RESCUE_REGION_DELTA = {
  latitudeDelta: 60,
  longitudeDelta: 60,
};

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

type ClusterableRestaurant = RestaurantDiscoveryMapProps['filteredRestaurants'][number] & {
  lat: number;
  lng: number;
};
type MarkerCluster = {
  id: string;
  latitude: number;
  longitude: number;
  restaurants: ClusterableRestaurant[];
};

function clusterKey(restaurants: ClusterableRestaurant[]): string {
  return restaurants.map((restaurant) => restaurant.id).sort().join('|');
}

function clusterRadiusForRegion(region: Region, variant: 'default' | 'cenaiva'): number {
  const baseRadius = variant === 'cenaiva' ? CENAIVA_CLUSTER_RADIUS_METERS : DEFAULT_CLUSTER_RADIUS_METERS;
  const latitude = Number.isFinite(region.latitude) ? region.latitude : DEFAULT_MAP_CENTER.latitude;
  const latitudeRadians = (latitude * Math.PI) / 180;
  const longitudeMeters =
    Math.abs(region.longitudeDelta) * 111_320 * Math.max(Math.cos(latitudeRadians), 0.2);
  const latitudeMeters = Math.abs(region.latitudeDelta) * 111_320;
  const visibleSpanMeters = Math.max(longitudeMeters, latitudeMeters);
  const scaledRadius = visibleSpanMeters * CLUSTER_RADIUS_VISIBLE_SPAN_RATIO;

  if (!Number.isFinite(scaledRadius) || scaledRadius <= 0) return baseRadius;
  return Math.max(MIN_CLUSTER_RADIUS_METERS, Math.min(baseRadius, scaledRadius));
}

function clusterRestaurants(
  restaurants: ClusterableRestaurant[],
  selectedId: string | null | undefined,
  radiusMeters: number,
  expandedRestaurantIds: Set<string>,
): MarkerCluster[] {
  const clusters: MarkerCluster[] = [];

  restaurants.forEach((restaurant) => {
    if (selectedId === restaurant.id || expandedRestaurantIds.has(restaurant.id)) {
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
      if (cluster.restaurants.some((item) => expandedRestaurantIds.has(item.id))) return false;
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
  const styles = useStyles();
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);
  const autoFocusDoneRef = useRef(false);
  const autoFocusResetKeyRef = useRef(autoFocusResetKey);
  const [currentRegion, setCurrentRegion] = useState<Region>(() => ({
    latitude: DEFAULT_MAP_CENTER.latitude,
    longitude: DEFAULT_MAP_CENTER.longitude,
    latitudeDelta: DEFAULT_MAP_CENTER.latitudeDelta,
    longitudeDelta: DEFAULT_MAP_CENTER.longitudeDelta,
  }));
  const [expandedClusterKey, setExpandedClusterKey] = useState<string | null>(null);
  const safeUserLocation = useMemo(
    () =>
      userLocation && isFiniteCoordinate(userLocation.latitude, userLocation.longitude)
        ? userLocation
        : null,
    [userLocation],
  );
  const safeRestaurants = useMemo(
    () => filteredRestaurants.filter(hasFiniteCoords),
    [filteredRestaurants],
  );
  const safeRestaurantIdsKey = useMemo(
    () => safeRestaurants.map((restaurant) => restaurant.id).join('|'),
    [safeRestaurants],
  );
  const expandedRestaurantIds = useMemo(
    () => new Set(expandedClusterKey ? expandedClusterKey.split('|') : []),
    [expandedClusterKey],
  );
  const clusterRadiusMeters = useMemo(
    () => clusterRadiusForRegion(currentRegion, markerVariant),
    [currentRegion, markerVariant],
  );
  const markerClusters = useMemo(
    () =>
      clusterRestaurants(
        safeRestaurants,
        selectedId,
        clusterRadiusMeters,
        expandedRestaurantIds,
      ),
    [clusterRadiusMeters, expandedRestaurantIds, safeRestaurants, selectedId],
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
    setExpandedClusterKey(null);
  }, [safeRestaurantIdsKey]);

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
    const nextRegion = {
      latitude: safeUserLocation.latitude,
      longitude: safeUserLocation.longitude,
      latitudeDelta: regionDelta.latitudeDelta,
      longitudeDelta: regionDelta.longitudeDelta,
    };
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
        nextRegion,
        260,
      );
      setCurrentRegion(nextRegion);
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
      setExpandedClusterKey(null);
      onMapPress();
    },
    [onMapPress],
  );

  const handleRegionChangeComplete = useCallback((region: Region) => {
    // If the user pinch-zoomed past a sane range, gestures can become stuck
    // (a known react-native-maps quirk on Apple Maps). Animate back to a
    // reasonable view so they can keep panning/zooming.
    const latDelta = Math.abs(region.latitudeDelta);
    const lonDelta = Math.abs(region.longitudeDelta);
    const isOutOfBounds =
      !Number.isFinite(latDelta) ||
      !Number.isFinite(lonDelta) ||
      !Number.isFinite(region.latitude) ||
      !Number.isFinite(region.longitude) ||
      latDelta > MAX_SAFE_LATITUDE_DELTA ||
      lonDelta > MAX_SAFE_LONGITUDE_DELTA;

    if (isOutOfBounds) {
      const rescueRegion: Region = {
        latitude: Number.isFinite(region.latitude) ? region.latitude : DEFAULT_MAP_CENTER.latitude,
        longitude: Number.isFinite(region.longitude) ? region.longitude : DEFAULT_MAP_CENTER.longitude,
        latitudeDelta: ZOOM_OUT_RESCUE_REGION_DELTA.latitudeDelta,
        longitudeDelta: ZOOM_OUT_RESCUE_REGION_DELTA.longitudeDelta,
      };
      mapRef.current?.animateToRegion(rescueRegion, 240);
      setCurrentRegion(rescueRegion);
      return;
    }

    setCurrentRegion(region);
  }, []);

  const handleLocate = useCallback(
    (coords: { latitude: number; longitude: number }) => {
      mapRef.current?.animateCamera(
        { center: coords, zoom: 13 },
        { duration: 400 },
      );
    },
    [],
  );

  const focusCluster = useCallback((cluster: MarkerCluster) => {
    if (cluster.restaurants.length <= 1) {
      const restaurant = cluster.restaurants[0];
      if (restaurant) onSelectRestaurant(restaurant.id);
      return;
    }

    setExpandedClusterKey(clusterKey(cluster.restaurants));
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
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        userInterfaceStyle="dark"
        mapType="standard"
        customMapStyle={CENAIVA_MAP_STYLE}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={false}
        showsCompass={false}
        showsBuildings={false}
        showsTraffic={false}
        showsPointsOfInterests={false}
        minZoomLevel={4}
        maxZoomLevel={18}
        scrollEnabled
        zoomEnabled
        zoomTapEnabled
        rotateEnabled
        pitchEnabled={false}
        toolbarEnabled={false}
        onPress={handleMapPress}
        onRegionChangeComplete={handleRegionChangeComplete}
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
              <RestaurantClusterMarker
                key={cluster.id}
                id={cluster.id}
                latitude={cluster.latitude}
                longitude={cluster.longitude}
                count={cluster.restaurants.length}
                onPress={() => focusCluster(cluster)}
              />
            );
          }

          const r = cluster.restaurants[0];
          const selected = selectedId === r.id;
          const displayPriceTier = normalizeRestaurantPriceRange(r.priceRange);
          return (
            <Marker
              key={`restaurant-${r.id}`}
              coordinate={{ latitude: r.lat, longitude: r.lng }}
              accessibilityLabel={r.name ?? 'Restaurant'}
              accessibilityHint={markerVariant === 'cenaiva' ? 'Shows restaurant catalog' : undefined}
              accessibilityRole="button"
              anchor={{ x: 0.5, y: MARKER_ANCHOR_Y }}
              zIndex={selected ? 999 : 1}
              onPress={() => onSelectRestaurant(r.id)}
              tracksViewChanges={selected}
            >
              <RestaurantMapMarkerContent
                priceTier={displayPriceTier}
                selected={selected}
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

      <UseMyLocationChip onLocate={handleLocate} cachedLocation={safeUserLocation} />
    </View>
  );
}
