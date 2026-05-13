import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
// expo-image honours EXIF rotation correctly on both iOS and Android, so a
// portrait shot stays portrait — react-native's <Image> sometimes ignores
// EXIF, which is what made captures appear horizontal here.
import { Image } from 'expo-image';
import type { ImageLoadEventData } from 'expo-image';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Button } from '@/components/ui';
import { StoryFilterFrame } from '@/components/storyFilters/StoryFilterFrame';
import { STORY_FILTERS } from '@/lib/storyFilters/registry';
import {
  STORY_CATEGORIES,
  type StoryFilterId,
} from '@/lib/storyFilters/types';
import { getSnapRestaurantName as DEMO_getSnapRestaurantName } from '@/lib/mock/snaps';
import { mockRestaurants as DEMO_RESTAURANTS } from '@/lib/mock/restaurants';
import { isDemoModeEnabled } from '@/lib/config/demoMode';

const getSnapRestaurantName: typeof DEMO_getSnapRestaurantName = (id) =>
  isDemoModeEnabled() ? DEMO_getSnapRestaurantName(id) : '';
const mockRestaurants: typeof DEMO_RESTAURANTS = isDemoModeEnabled() ? DEMO_RESTAURANTS : [];
import { captureStyledSnapToTmpFile } from '@/lib/snapOverlays/captureStyledSnap';

// Circular filter thumbnail dimensions
const THUMB_D = 58;
const THUMB_SCALE = THUMB_D / 224;
const THUMB_DESIGN_W = 224;
const THUMB_DESIGN_H = 398;

const CATEGORY_GRADIENT: Record<string, [string, string]> = {
  cute:     ['#fde8ea', '#f4aec0'],
  playful:  ['#fef6ec', '#f5c29a'],
  fancy:    ['#fdf8ed', '#e8c464'],
  food:     ['#fff4e2', '#f5a454'],
  location: ['#eaf3fc', '#9ab8d8'],
};

const FRAME_STYLE = { borderRadius: 0 };

export default function SnapStylesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowW, height: windowH } = useWindowDimensions();
  const captureRefView = useRef<View>(null);

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

  const [filterId, setFilterId] = useState<StoryFilterId | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedFilter = filterId ? STORY_FILTERS.find((f) => f.id === filterId) : null;

  const filtersByCategory = useMemo(
    () =>
      STORY_CATEGORIES.map((cat) => ({
        cat,
        filters: STORY_FILTERS.filter((f) => f.category === cat.id),
      })),
    [],
  );

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
  const CONTINUE_BOTTOM = insets.bottom + 16;
  const STRIP_BOTTOM = insets.bottom + 82;
  const STRIP_TOP = insets.top + 64;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* ── CAPTURE TARGET: full-screen photo + filter overlay ── */}
      <View
        ref={captureRefView}
        collapsable={false}
        style={[StyleSheet.absoluteFillObject, { width: windowW, height: windowH }]}
      >
        {hasImage && (
          <Image
            source={{ uri: decodedUri }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            contentPosition="bottom"
          />
        )}
        <StoryFilterFrame
          filterId={filterId}
          width={windowW}
          height={windowH}
          capturedAt={capturedAt}
          restaurantName={selectedRestaurantName}
          city={selectedRestaurantCity}
          area={selectedRestaurantArea}
          containerStyle={FRAME_STYLE}
        />
      </View>

      {/* ── Top scrim for readability ── */}
      <LinearGradient
        colors={['rgba(0,0,0,0.52)', 'transparent']}
        style={styles.topGradient}
        pointerEvents="none"
      />

      {/* ── Bottom scrim for readability ── */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.75)']}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* ── Back button (top-left, overlaid) ── */}
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={[styles.backBtn, { top: insets.top + 10 }]}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </Pressable>

      {/* ── Screen title (top-center, overlaid) ── */}
      <Text style={[styles.title, { top: insets.top + 14 }]} numberOfLines={1}>
        {returningToReward ? 'Filters for sharing' : 'Style your snap'}
      </Text>

      {/* ── Snapchat-style vertical filter strip (right side, overlaid) ── */}
      <ScrollView
        style={[styles.filterStrip, { top: STRIP_TOP, bottom: STRIP_BOTTOM }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.filterStripContent}
      >
        {/* Original — no filter */}
        <Pressable
          onPress={() => setFilterId(null)}
          style={({ pressed }) => [styles.thumbHit, pressed && styles.thumbHitPressed]}
        >
          <View style={[styles.thumbCircle, !filterId && styles.thumbCircleOn]}>
            <LinearGradient
              colors={['#2c2218', '#100c08']}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.thumbNoneText}>none</Text>
          </View>
          <Text style={[styles.thumbLabel, !filterId && styles.thumbLabelOn]} numberOfLines={1}>
            Original
          </Text>
        </Pressable>

        {/* All filters grouped by category with section labels */}
        {filtersByCategory.map(({ cat, filters }) => (
          <React.Fragment key={cat.id}>
            <View style={styles.catDivider} />
            <Text style={styles.catLabel}>{cat.title}</Text>
            {filters.map((entry) => {
              const on = entry.id === filterId;
              const gradient = CATEGORY_GRADIENT[entry.category];
              return (
                <Pressable
                  key={entry.id}
                  onPress={() => setFilterId(on ? null : entry.id)}
                  style={({ pressed }) => [styles.thumbHit, pressed && styles.thumbHitPressed]}
                >
                  <View style={[styles.thumbCircle, on && styles.thumbCircleOn]}>
                    <LinearGradient
                      colors={gradient}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <View pointerEvents="none" style={styles.thumbOverlay}>
                      <entry.Component width={THUMB_DESIGN_W} height={THUMB_DESIGN_H} />
                    </View>
                  </View>
                  <Text style={[styles.thumbLabel, on && styles.thumbLabelOn]} numberOfLines={2}>
                    {entry.name}
                  </Text>
                </Pressable>
              );
            })}
          </React.Fragment>
        ))}
      </ScrollView>

      {/* ── Selected filter name (above Continue button) ── */}
      {selectedFilter && (
        <View style={[styles.filterNameWrap, { bottom: CONTINUE_BOTTOM + 52 }]}>
          <Text style={styles.filterNameText}>{selectedFilter.name}</Text>
        </View>
      )}

      {/* ── Continue button (bottom, overlaid) ── */}
      <View style={[styles.continueWrap, { bottom: CONTINUE_BOTTOM }]}>
        <Button
          title={returningToReward ? 'Apply & return to share' : 'Continue'}
          onPress={() => void handleContinue()}
          disabled={!hasImage || !restaurantId || busy}
          loading={busy}
          size="lg"
        />
      </View>

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
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
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
  // Right vertical filter strip — floats over the photo
  filterStrip: {
    position: 'absolute',
    right: 6,
    width: 72,
  },
  filterStripContent: {
    alignItems: 'center',
    paddingBottom: 8,
    gap: 2,
  },
  catDivider: {
    width: 32,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 8,
    marginBottom: 4,
  },
  catLabel: {
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  thumbHit: {
    alignItems: 'center',
    paddingVertical: 3,
  },
  thumbHitPressed: {
    opacity: 0.72,
  },
  thumbCircle: {
    width: THUMB_D,
    height: THUMB_D,
    borderRadius: THUMB_D / 2,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 4,
    elevation: 5,
  },
  thumbCircleOn: {
    borderColor: '#c9a84c',
    shadowColor: '#c9a84c',
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  thumbOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: THUMB_DESIGN_W,
    height: THUMB_DESIGN_H,
    transform: [{ scale: THUMB_SCALE }],
    transformOrigin: 'top left',
  },
  thumbNoneText: {
    fontSize: 7,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },
  thumbLabel: {
    marginTop: 3,
    fontSize: 7.5,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    width: 64,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  thumbLabelOn: {
    color: '#c9a84c',
    fontWeight: '700',
  },
  filterNameWrap: {
    position: 'absolute',
    left: 16,
    right: 86,
    alignItems: 'center',
  },
  filterNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 0.2,
  },
  continueWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  busyOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});
