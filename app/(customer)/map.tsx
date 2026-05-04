import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  Linking,
  Platform,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RestaurantDiscoveryMap } from '@/components/map/RestaurantDiscoveryMap';
import { RestaurantMapDetailSheet } from '@/components/map/RestaurantMapDetailSheet';
import { useCenaivaAssistant } from '@/lib/cenaiva/CenaivaAssistantProvider';
import { mockMapRestaurants } from '@/lib/mock/mapRestaurants';
import {
  applyMapFilter,
  DEFAULT_MAP_CENTER,
  type RestaurantWithDistance,
  type MapFilterId,
  withDistances,
} from '@/lib/map/mapFilters';
import { formatDistanceMeters } from '@/lib/map/geo';
import { useColors, createStyles, spacing, borderRadius, typography } from '@/lib/theme';

const FILTERS: { id: MapFilterId; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'nearby', labelKey: 'nearby', icon: 'navigate-outline' },
  { id: 'topRated', labelKey: 'topRated', icon: 'star-outline' },
  { id: 'dateNight', labelKey: 'dateNight', icon: 'moon-outline' },
  { id: 'outdoor', labelKey: 'outdoor', icon: 'leaf-outline' },
  { id: 'openNow', labelKey: 'openNow', icon: 'time-outline' },
];

const CARD_WIDTH = 248;
const RAIL_PADDING_TOP = spacing.sm;
const RAIL_CARD_MIN_HEIGHT = 76;
const RAIL_CONTENT_PAD_BOTTOM = spacing.xs;

const useStyles = createStyles((c) => ({
  root: {
    flex: 1,
    backgroundColor: c.bgBase,
  },
  title: {
    ...typography.h2,
    color: c.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginTop: 2,
  },
  topOverlay: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(10,10,10,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
    zIndex: 12,
    elevation: 12,
  },
  topOverlayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  settingsFab: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(26,26,26,0.96)',
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionHint: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 11,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(10,10,10,0.78)',
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  permissionHintText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    flex: 1,
  },
  filtersContent: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(26,26,26,0.9)',
  },
  filterChipActive: {
    borderColor: c.gold,
    backgroundColor: c.gold,
  },
  filterChipText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: c.bgBase,
  },
  carouselWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    paddingTop: RAIL_PADDING_TOP,
    backgroundColor: 'rgba(8,8,8,0.82)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 16 },
      default: {},
    }),
  },
  carouselContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  restaurantCard: {
    width: CARD_WIDTH,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(18,18,18,0.92)',
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 76,
  },
  restaurantCardActive: {
    borderColor: c.gold,
    backgroundColor: 'rgba(24,20,12,0.95)',
  },
  restaurantThumb: {
    width: 62,
    height: 62,
    borderRadius: borderRadius.md,
    backgroundColor: c.bgElevated,
  },
  restaurantBody: {
    flex: 1,
    minWidth: 0,
  },
  restaurantName: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  restaurantMeta: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginTop: 2,
  },
  restaurantStar: {
    fontSize: 12,
    lineHeight: 14,
    color: c.gold,
    fontWeight: '700',
  },
  restaurantStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
    gap: 4,
  },
  restaurantStatText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    fontWeight: '600',
  },
  restaurantDot: {
    color: c.textMuted,
    marginHorizontal: 2,
  },
}));

export default function MapScreen() {
  const c = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const router = useRouter();
  const assistant = useCenaivaAssistant();
  const insets = useSafeAreaInsets();
  const carouselRef = useRef<FlatList<RestaurantWithDistance>>(null);

  const [filter, setFilter] = useState<MapFilterId>('nearby');
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [sheetRestaurantId, setSheetRestaurantId] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({
    lat: DEFAULT_MAP_CENTER.latitude,
    lng: DEFAULT_MAP_CENTER.longitude,
  });
  const [locationMode, setLocationMode] = useState<'live' | 'fallback'>('fallback');
  const [locationReady, setLocationReady] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setLocationReady(true);
      setLocationMode('fallback');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setPermissionDenied(true);
          setUserCoords({
            lat: DEFAULT_MAP_CENTER.latitude,
            lng: DEFAULT_MAP_CENTER.longitude,
          });
          setLocationMode('fallback');
          setLocationReady(true);
          return;
        }
        setPermissionDenied(false);
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationMode('live');
      } catch {
        if (!cancelled) {
          setUserCoords({
            lat: DEFAULT_MAP_CENTER.latitude,
            lng: DEFAULT_MAP_CENTER.longitude,
          });
          setLocationMode('fallback');
        }
      } finally {
        if (!cancelled) setLocationReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const anchorLat = userCoords.lat;
  const anchorLng = userCoords.lng;

  const withDist = useMemo(
    () => withDistances(mockMapRestaurants, anchorLat, anchorLng),
    [anchorLat, anchorLng],
  );

  const filtered = useMemo(() => applyMapFilter(withDist, filter), [withDist, filter]);

  const bottomRailInset = useMemo(() => {
    const bottomPad = Math.max(insets.bottom, spacing.md);
    return RAIL_PADDING_TOP + RAIL_CARD_MIN_HEIGHT + RAIL_CONTENT_PAD_BOTTOM + bottomPad;
  }, [insets.bottom]);

  const idToIndex = useMemo(
    () => new Map(filtered.map((restaurant, index) => [restaurant.id, index])),
    [filtered],
  );

  useEffect(() => {
    if (focusedId && !filtered.some((r) => r.id === focusedId)) {
      setFocusedId(null);
    }
    if (sheetRestaurantId && !filtered.some((r) => r.id === sheetRestaurantId)) {
      setSheetRestaurantId(null);
    }
  }, [focusedId, sheetRestaurantId, filtered]);

  const selectedRestaurant = useMemo(() => {
    if (!sheetRestaurantId) return null;
    return withDist.find((r) => r.id === sheetRestaurantId) ?? null;
  }, [sheetRestaurantId, withDist]);

  const scrollToRestaurantCard = useCallback(
    (id: string) => {
      const idx = idToIndex.get(id);
      if (idx === undefined) return;
      carouselRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
    },
    [idToIndex],
  );

  const onSelectRestaurant = useCallback(
    (id: string) => {
      setFocusedId(id);
      setSheetRestaurantId(id);
      scrollToRestaurantCard(id);
    },
    [scrollToRestaurantCard],
  );

  const onMapPress = useCallback(() => {
    setSheetRestaurantId(null);
    setFocusedId(null);
  }, []);

  const showUserLocation = locationMode === 'live' && !!userCoords && !permissionDenied;

  const onCarouselMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const stride = CARD_WIDTH + spacing.sm;
      const idx = Math.max(0, Math.min(filtered.length - 1, Math.round(offsetX / stride)));
      const restaurant = filtered[idx];
      if (!restaurant) return;
      setFocusedId(restaurant.id);
    },
    [filtered],
  );

  const renderCarouselCard = useCallback(
    ({ item }: { item: RestaurantWithDistance }) => {
      const isActive = focusedId === item.id;
      return (
        <Pressable
          onPress={() => {
            setFocusedId(item.id);
            setSheetRestaurantId(item.id);
            scrollToRestaurantCard(item.id);
          }}
          style={[styles.restaurantCard, isActive && styles.restaurantCardActive]}
        >
          <Image source={{ uri: item.coverPhotoUrl }} style={styles.restaurantThumb} />
          <View style={styles.restaurantBody}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.restaurantMeta} numberOfLines={1}>
              {item.cuisineType} · {item.area}
            </Text>
            <View style={styles.restaurantStats}>
              <Text style={styles.restaurantStar} accessible={false}>
                ★
              </Text>
              <Text style={styles.restaurantStatText}>{item.avgRating.toFixed(1)}</Text>
              <Text style={styles.restaurantDot}>·</Text>
              <Text style={styles.restaurantStatText}>{formatDistanceMeters(item.distanceMeters)}</Text>
            </View>
          </View>
        </Pressable>
      );
    },
    [focusedId, scrollToRestaurantCard, styles],
  );

  return (
    <View style={styles.root}>
      <RestaurantDiscoveryMap
        filteredRestaurants={filtered}
        selectedId={focusedId}
        onSelectRestaurant={onSelectRestaurant}
        onMapPress={onMapPress}
        userLocation={{ latitude: userCoords.lat, longitude: userCoords.lng }}
        showUserLocation={showUserLocation}
        locationReady={locationReady}
        contentBottomInset={bottomRailInset}
      />

      <View style={[styles.topOverlay, { top: insets.top + spacing.sm }]}>
        <View style={styles.topOverlayHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('tabs.map')}</Text>
            <Text style={styles.subtitle}>Nearby restaurants</Text>
          </View>
          <Pressable
            style={styles.settingsFab}
            onPress={() => {
              if (permissionDenied && Platform.OS !== 'web') Linking.openSettings();
            }}
          >
            <Ionicons name="options-outline" size={19} color={c.gold} />
          </Pressable>
        </View>

        <FlatList
          data={FILTERS}
          horizontal
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
          renderItem={({ item }) => {
            const active = filter === item.id;
            return (
              <Pressable
                onPress={() => setFilter(item.id)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Ionicons
                  name={item.icon}
                  size={14}
                  color={active ? c.bgBase : c.textSecondary}
                />
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {t(`mapScreen.${item.labelKey}`)}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      <View
        style={[
          styles.carouselWrap,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <FlatList
          ref={carouselRef}
          horizontal
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderCarouselCard}
          onMomentumScrollEnd={onCarouselMomentumEnd}
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + spacing.sm}
          decelerationRate="fast"
          contentContainerStyle={styles.carouselContent}
          getItemLayout={(_, index) => ({
            length: CARD_WIDTH + spacing.sm,
            offset: (CARD_WIDTH + spacing.sm) * index,
            index,
          })}
        />
      </View>

      {permissionDenied && locationReady ? (
        <Pressable
          onPress={() => Linking.openSettings()}
          style={[styles.permissionHint, { top: insets.top + 148 }]}
        >
          <Ionicons name="location-outline" size={16} color={c.gold} />
          <Text style={styles.permissionHintText}>{t('mapScreen.locationFallback')}</Text>
        </Pressable>
      ) : null}

      <RestaurantMapDetailSheet
        restaurant={selectedRestaurant}
        onDismiss={() => setSheetRestaurantId(null)}
        onBook={() => {
          if (!selectedRestaurant) return;
          router.push(`/booking/${selectedRestaurant.id}/step2-time`);
        }}
        onViewDetails={() => {
          if (!selectedRestaurant) return;
          router.push(`/discover/${selectedRestaurant.id}`);
        }}
        onAskAi={() => {
          if (!selectedRestaurant) return;
          assistant.open(selectedRestaurant.id, selectedRestaurant.name);
          setSheetRestaurantId(null);
        }}
      />
    </View>
  );
}
