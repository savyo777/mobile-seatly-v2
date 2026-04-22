import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type MapPressEvent } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RestaurantMapMarker } from '@/components/map/RestaurantMapMarker';
import { googleDarkMapStyle } from '@/lib/map/darkMapStyle';
import { DEFAULT_MAP_CENTER } from '@/lib/map/mapFilters';
import type { RestaurantDiscoveryMapProps } from '@/components/map/restaurantMapTypes';
import { useColors, createStyles, spacing, borderRadius, typography, shadows } from '@/lib/theme';

const useStyles = createStyles((c) => ({
  mapShell: {
    flex: 1,
    minHeight: 300,
    width: '100%',
    backgroundColor: c.bgBase,
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,10,0.55)',
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
    backgroundColor: 'rgba(10,10,10,0.25)',
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
  contentBottomInset = 0,
}: RestaurantDiscoveryMapProps) {
  const c = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);
  const detailOpen = !!selectedId;

  const recenterOnUser = useCallback(() => {
    if (!userLocation) return;
    mapRef.current?.animateToRegion(
      {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      },
      420,
    );
  }, [userLocation]);

  const initialRegion = {
    latitude: DEFAULT_MAP_CENTER.latitude,
    longitude: DEFAULT_MAP_CENTER.longitude,
    latitudeDelta: DEFAULT_MAP_CENTER.latitudeDelta,
    longitudeDelta: DEFAULT_MAP_CENTER.longitudeDelta,
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
        userInterfaceStyle="dark"
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        customMapStyle={Platform.OS === 'android' ? googleDarkMapStyle : undefined}
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
        {!!userLocation && !showUserLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.fallbackUserDotOuter}>
              <View style={styles.fallbackUserDotInner} />
            </View>
          </Marker>
        )}

        {filteredRestaurants.map((r) => (
          <RestaurantMapMarker
            key={r.id}
            id={r.id}
            latitude={r.lat}
            longitude={r.lng}
            rating={r.avgRating}
            priceTier={r.priceRange}
            selected={selectedId === r.id}
            onPress={onSelectRestaurant}
          />
        ))}
      </MapView>

      {filteredRestaurants.length === 0 && (
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

      {locationReady && userLocation ? (
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
