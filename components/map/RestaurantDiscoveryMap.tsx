import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type MapPressEvent } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RestaurantMapMarkerContent } from '@/components/map/RestaurantMapMarker';
import { googleDarkMapStyle } from '@/lib/map/darkMapStyle';
import { DEFAULT_MAP_CENTER } from '@/lib/map/mapFilters';
import type { RestaurantDiscoveryMapProps } from '@/components/map/restaurantMapTypes';
import { useColors, useTheme, createStyles, spacing, borderRadius, typography, shadows } from '@/lib/theme';

const DEFAULT_RECENTER_REGION_DELTA = {
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
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

function safeRating(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function safePriceTier(value: number): number {
  return Math.max(1, Math.min(4, Number.isFinite(value) ? value : 1));
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

        {safeRestaurants.map((r) => {
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
