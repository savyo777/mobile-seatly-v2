import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
// expo-image honours EXIF rotation correctly on both iOS and Android, so a
// portrait shot stays portrait — react-native's <Image> sometimes ignores
// EXIF, which is what made captures appear horizontal here.
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StoryFilterFrame } from '@/components/storyFilters/StoryFilterFrame';
import { STORY_FILTERS } from '@/lib/storyFilters/registry';
import {
  type StoryFilterCategory,
  type StoryFilterEntry,
  type StoryFilterId,
} from '@/lib/storyFilters/types';
import { getSnapRestaurantName as DEMO_getSnapRestaurantName } from '@/lib/mock/snaps';
import { mockRestaurants as DEMO_RESTAURANTS } from '@/lib/mock/restaurants';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { captureStyledSnapToTmpFile } from '@/lib/snapOverlays/captureStyledSnap';

const getSnapRestaurantName: typeof DEMO_getSnapRestaurantName = (id) =>
  isDemoModeEnabled() ? DEMO_getSnapRestaurantName(id) : '';
const mockRestaurants: typeof DEMO_RESTAURANTS = isDemoModeEnabled() ? DEMO_RESTAURANTS : [];

// iOS-Camera-style carousel layout: small side chips, big centred chip.
const CHIP_SIZE = 52;
const SIDE_SCALE = 26 / 52;
const CHIP_GAP = 14;
const CHIP_STRIDE = CHIP_SIZE + CHIP_GAP;
const RING_SIZE = CHIP_SIZE + 8;

// Filter components are designed against a 224 × 398 frame.
const FRAME_REF_W = 224;
const FRAME_REF_H = 398;
const CHIP_FILTER_SCALE = CHIP_SIZE / FRAME_REF_W;

const CARD_FRAME_STYLE = { borderRadius: 0, backgroundColor: '#000' };

type FilterItem =
  | { kind: 'original'; id: '__none__'; categoryId: null }
  | {
      kind: 'filter';
      id: StoryFilterId;
      categoryId: StoryFilterCategory;
      entry: StoryFilterEntry;
    };

const FILTER_ITEMS: FilterItem[] = [
  { kind: 'original', id: '__none__', categoryId: null },
  ...STORY_FILTERS.map<FilterItem>((f) => ({
    kind: 'filter',
    id: f.id,
    categoryId: f.category,
    entry: f,
  })),
];

export default function SnapStylesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowW, height: windowH } = useWindowDimensions();
  const captureRefView = useRef<View>(null);
  const listRef = useRef<FlatList<FilterItem>>(null);

  const {
    restaurantId,
    photoUri,
    bookingId,
    capturedAt: capturedAtParam,
    returnTo,
    points: pointsParam,
    restaurantName: rewardRestaurantNameParam,
  } = useLocalSearchParams<{
    restaurantId?: string;
    photoUri?: string;
    bookingId?: string;
    capturedAt?: string;
    partySize?: string;
    returnTo?: string;
    points?: string;
    restaurantName?: string;
  }>();

  const returningToReward = returnTo === 'reward';

  const decodedUri = useMemo(() => {
    if (!photoUri) return '';
    try {
      return decodeURIComponent(photoUri);
    } catch {
      return photoUri;
    }
  }, [photoUri]);

  const capturedAt = useMemo(() => {
    const value = Number(capturedAtParam);
    return Number.isFinite(value) && value > 0 ? value : Date.now();
  }, [capturedAtParam]);

  const restaurant = useMemo(
    () => mockRestaurants.find((item) => item.id === restaurantId) ?? null,
    [restaurantId],
  );
  const selectedRestaurantName = useMemo(() => {
    if (restaurant?.name) return restaurant.name;
    if (restaurantId) return getSnapRestaurantName(restaurantId);
    return 'Restaurant';
  }, [restaurant?.name, restaurantId]);
  const selectedRestaurantCity = restaurant?.city ?? 'Toronto';
  const selectedRestaurantArea = restaurant?.area ?? selectedRestaurantCity;

  const [centeredIndex, setCenteredIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const centeredItem = FILTER_ITEMS[centeredIndex] ?? FILTER_ITEMS[0];
  const filterId: StoryFilterId | null =
    centeredItem.kind === 'filter' ? centeredItem.id : null;
  const currentFilterPillText =
    centeredItem.kind === 'original'
      ? 'ORIGINAL'
      : centeredItem.entry.name.toUpperCase();

  // Carousel padding so first/last chip can sit at the centre line.
  const carouselSidePad = Math.max(0, (windowW - CHIP_STRIDE) / 2);

  // Native-driven scroll position drives each chip's scale interpolation.
  const scrollX = useRef(new Animated.Value(0)).current;

  // Pill cross-fade fires on filter-id change (matches iOS Camera).
  const pillOpacity = useRef(new Animated.Value(1)).current;
  const lastFilterIdRef = useRef<StoryFilterId | null | 'init'>('init');
  useEffect(() => {
    if (lastFilterIdRef.current === 'init') {
      lastFilterIdRef.current = filterId;
      return;
    }
    if (lastFilterIdRef.current !== filterId) {
      lastFilterIdRef.current = filterId;
      pillOpacity.setValue(0);
      Animated.timing(pillOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [filterId, pillOpacity]);

  const handleScrollListener = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.max(
        0,
        Math.min(FILTER_ITEMS.length - 1, Math.round(x / CHIP_STRIDE)),
      );
      setCenteredIndex((prev) => (prev === i ? prev : i));
    },
    [],
  );

  const onScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: true, listener: handleScrollListener },
      ),
    [scrollX, handleScrollListener],
  );

  const onChipPress = useCallback((index: number) => {
    listRef.current?.scrollToOffset({
      offset: index * CHIP_STRIDE,
      animated: true,
    });
  }, []);

  const goDetails = useCallback(
    async (finalUri: string, preservedFilterId?: StoryFilterId | null) => {
      if (!restaurantId) return;
      const href: Href = {
        pathname: '/(customer)/discover/post-review/details',
        params: {
          photoUri: encodeURIComponent(finalUri),
          restaurantId,
          ...(bookingId ? { bookingId } : {}),
          ...(preservedFilterId
            ? { filterId: preservedFilterId, capturedAt: String(capturedAt) }
            : {}),
        },
      };
      router.push(href);
    },
    [bookingId, capturedAt, restaurantId, router],
  );

  const goReward = useCallback(
    (finalUri: string, preservedFilterId?: StoryFilterId | null) => {
      if (!restaurantId) return;
      router.replace({
        pathname: '/(customer)/discover/post-review/reward',
        params: {
          points: pointsParam ?? '25',
          restaurantName: rewardRestaurantNameParam ?? '',
          restaurantId,
          photoUri: encodeURIComponent(finalUri),
          ...(bookingId ? { bookingId } : {}),
          ...(preservedFilterId
            ? { filterId: preservedFilterId, capturedAt: String(capturedAt) }
            : {}),
        },
      });
    },
    [bookingId, capturedAt, restaurantId, router, pointsParam, rewardRestaurantNameParam],
  );

  const handleContinue = useCallback(async () => {
    if (!decodedUri || !restaurantId) {
      Alert.alert('Missing photo', 'Go back and choose a photo first.');
      return;
    }
    const finish = async (finalUri: string, preservedFilterId?: StoryFilterId | null) => {
      if (returningToReward) {
        goReward(finalUri, preservedFilterId);
        return;
      }
      await goDetails(finalUri, preservedFilterId);
    };
    if (!filterId) {
      await finish(decodedUri);
      return;
    }
    try {
      setBusy(true);
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      const uri = await captureStyledSnapToTmpFile(captureRefView);
      if (uri) {
        await finish(uri);
      } else {
        await finish(decodedUri, filterId);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not render your styled snap.';
      Alert.alert('Capture failed', msg);
    } finally {
      setBusy(false);
    }
  }, [decodedUri, restaurantId, filterId, goDetails, returningToReward, goReward]);

  const hasImage = decodedUri.length > 0;

  const continueBottom = 0;
  // Filter-name pill sits below the carousel (between carousel + Retake/Next pills).
  const pillBottom = 44;
  const carouselBottom = pillBottom + 28 + 8; // pill height (~28) + 8px gap

  // Push the filter overlay decorations away from the bottom chrome
  // so corner-anchored elements (watermark, labels, badges) aren't clipped.
  const overlayBottomInset = carouselBottom + RING_SIZE + 12;
  const overlayTopInset = insets.top + 56;

  const getItemLayout = useCallback(
    (_: ArrayLike<FilterItem> | null | undefined, index: number) => ({
      length: CHIP_STRIDE,
      offset: CHIP_STRIDE * index,
      index,
    }),
    [],
  );

  const renderChip = useCallback(
    ({ item, index }: { item: FilterItem; index: number }) => {
      const inputRange = [
        (index - 1) * CHIP_STRIDE,
        index * CHIP_STRIDE,
        (index + 1) * CHIP_STRIDE,
      ];
      const scale = scrollX.interpolate({
        inputRange,
        outputRange: [SIDE_SCALE, 1, SIDE_SCALE],
        extrapolate: 'clamp',
      });
      return (
        <Pressable
          onPress={() => onChipPress(index)}
          hitSlop={6}
          style={({ pressed }) => [
            styles.chipSlot,
            pressed && { opacity: 0.72 },
          ]}
        >
          <Animated.View style={[styles.chipCircle, { transform: [{ scale }] }]}>
            {hasImage ? (
              <Image
                source={{ uri: decodedUri }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                contentPosition="bottom"
              />
            ) : (
              <View style={[StyleSheet.absoluteFillObject, styles.chipPlaceholder]} />
            )}
            {item.kind === 'filter' && (
              <View pointerEvents="none" style={styles.chipFilterOverlay}>
                <item.entry.Component
                  width={FRAME_REF_W}
                  height={FRAME_REF_H}
                  capturedAt={capturedAt}
                  restaurantName={selectedRestaurantName}
                  city={selectedRestaurantCity}
                  area={selectedRestaurantArea}
                />
              </View>
            )}
            {item.kind === 'original' && (
              <View pointerEvents="none" style={styles.chipNoneBadge}>
                <Ionicons
                  name="ban-outline"
                  size={20}
                  color="rgba(255,255,255,0.88)"
                />
              </View>
            )}
          </Animated.View>
        </Pressable>
      );
    },
    [
      scrollX,
      onChipPress,
      hasImage,
      decodedUri,
      capturedAt,
      selectedRestaurantName,
      selectedRestaurantCity,
      selectedRestaurantArea,
    ],
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* ── CAPTURE TARGET: full-screen styled snap (Snapchat-style) ── */}
      <View
        ref={captureRefView}
        collapsable={false}
        style={[StyleSheet.absoluteFillObject, { width: windowW, height: windowH }]}
      >
        <StoryFilterFrame
          filterId={filterId}
          width={windowW}
          height={windowH}
          capturedAt={capturedAt}
          restaurantName={selectedRestaurantName}
          city={selectedRestaurantCity}
          area={selectedRestaurantArea}
          mediaSlot={
            hasImage ? (
              <Image
                source={{ uri: decodedUri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                contentPosition="center"
              />
            ) : null
          }
          containerStyle={CARD_FRAME_STYLE}
          overlayInsets={{ top: overlayTopInset, bottom: overlayBottomInset }}
        />
      </View>

      {/* ── Back button ── */}
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={[styles.backBtn, { top: insets.top + 10 }]}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </Pressable>

      {/* ── Screen title ── */}
      <Text style={[styles.title, { top: insets.top + 14 }]} numberOfLines={1}>
        {returningToReward ? 'Filters for sharing' : 'Style your snap'}
      </Text>

      {/* ── Centered filter pill (iOS-Camera style) above carousel ── */}
      <Animated.View
        style={[styles.filterPill, { bottom: pillBottom, opacity: pillOpacity }]}
        pointerEvents="none"
      >
        <Text style={styles.filterPillText} numberOfLines={1}>
          {currentFilterPillText}
        </Text>
      </Animated.View>

      {/* ── Horizontal filter carousel (snap-to-centre, native scale) ── */}
      <View
        style={[styles.carouselWrap, { bottom: carouselBottom }]}
        pointerEvents="box-none"
      >
        {/* White selection ring pinned to centre of the screen */}
        <View pointerEvents="none" style={styles.centerRing} />

        <Animated.FlatList
          ref={listRef}
          data={FILTER_ITEMS}
          horizontal
          keyExtractor={(it) => it.id}
          renderItem={renderChip}
          getItemLayout={getItemLayout}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: carouselSidePad }}
          snapToInterval={CHIP_STRIDE}
          decelerationRate="fast"
          onScroll={onScroll}
          scrollEventThrottle={16}
          bounces={false}
          initialNumToRender={9}
          windowSize={5}
          removeClippedSubviews={false}
        />
      </View>

      {/* ── Continue pill (bottom-right, Snapchat yellow) ── */}
      <Pressable
        onPress={() => void handleContinue()}
        disabled={!hasImage || !restaurantId || busy}
        style={({ pressed }) => [
          styles.continuePill,
          { bottom: continueBottom },
          (!hasImage || !restaurantId || busy) && styles.continuePillDisabled,
          pressed && styles.continuePillPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={returningToReward ? 'Apply' : 'Next'}
      >
        <Text style={styles.continuePillText}>
          {returningToReward ? 'Apply' : 'Next'}
        </Text>
        <Ionicons name="arrow-forward" size={18} color="#1a1410" />
      </Pressable>

      {/* ── Retake pill (bottom-left, paired with Next) ── */}
      {!returningToReward && (
        <Pressable
          onPress={() => router.back()}
          disabled={busy}
          style={({ pressed }) => [
            styles.retakePill,
            { bottom: continueBottom },
            busy && styles.continuePillDisabled,
            pressed && styles.continuePillPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Retake"
        >
          <Ionicons name="camera-reverse-outline" size={18} color="#fff" />
          <Text style={styles.retakePillText}>Retake</Text>
        </Pressable>
      )}

      {/* ── Busy capture overlay ── */}
      {busy && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.busyOverlay]}>
          <ActivityIndicator color="#c9a84c" size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    position: 'absolute',
    left: 64,
    right: 16,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  filterPill: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    maxWidth: '70%',
  },
  filterPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  carouselWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: RING_SIZE,
    justifyContent: 'center',
  },
  centerRing: {
    position: 'absolute',
    alignSelf: 'center',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    borderColor: '#c9a84c',
    shadowColor: '#c9a84c',
    shadowOpacity: 0.5,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  chipSlot: {
    width: CHIP_STRIDE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCircle: {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: CHIP_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#111',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  chipPlaceholder: {
    backgroundColor: '#1a1410',
  },
  chipFilterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: FRAME_REF_W,
    height: FRAME_REF_H,
    transform: [{ scale: CHIP_FILTER_SCALE }],
    transformOrigin: 'top left',
  },
  chipNoneBadge: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  continuePill: {
    position: 'absolute',
    right: 16,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#c9a84c',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
  },
  continuePillDisabled: {
    opacity: 0.5,
  },
  continuePillPressed: {
    opacity: 0.85,
  },
  retakePill: {
    position: 'absolute',
    left: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  retakePillText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  continuePillText: {
    color: '#1a1410',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  busyOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});
