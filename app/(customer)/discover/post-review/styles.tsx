import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
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
import { Button, ScreenWrapper } from '@/components/ui';
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
import {
  DEFAULT_SNAP_PHOTO_ASPECT,
  getSnapPreviewLayout,
} from '@/lib/storyFilters/previewLayout';
import { useColors, createStyles, borderRadius, spacing, typography } from '@/lib/theme';

// Right-side filter strip dimensions
const STRIP_W = 82;
const THUMB_W = 62;
const THUMB_H = 86;
const THUMB_DESIGN_W = 224;
const THUMB_DESIGN_H = 398;
const THUMB_SCALE = THUMB_W / THUMB_DESIGN_W;

const CATEGORY_GRADIENT: Record<string, [string, string]> = {
  cute:     ['#fde8ea', '#f4aec0'],
  playful:  ['#fef6ec', '#f5c29a'],
  fancy:    ['#fdf8ed', '#e8c464'],
  food:     ['#fff4e2', '#f5a454'],
  location: ['#eaf3fc', '#9ab8d8'],
};

const useStyles = createStyles((c) => ({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  headerTitle: {
    flex: 1,
    ...typography.h3,
    color: c.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: { width: 40 },
  // Main content: photo left + filter strip right
  contentRow: {
    flex: 1,
    flexDirection: 'row',
  },
  photoCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  previewWrap: {
    position: 'relative',
  },
  captureBox: {
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
    backgroundColor: '#0c0a08',
  },
  captureImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  filterNameBadge: {
    marginTop: spacing.xs,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
  },
  filterNameText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.gold,
    letterSpacing: 0.3,
  },
  // Snapchat-style vertical filter strip on the right
  filterStrip: {
    width: STRIP_W,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: c.border,
  },
  filterStripContent: {
    paddingVertical: spacing.sm,
    gap: 6,
    alignItems: 'center',
  },
  catLabel: {
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: c.textMuted,
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 2,
    marginLeft: (STRIP_W - THUMB_W) / 2,
  },
  thumbCard: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#1a140e',
    shadowColor: '#c9784a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  thumbCardOn: {
    borderColor: c.gold,
    shadowOpacity: 0.38,
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
  thumbNone: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbNoneText: {
    fontSize: 7,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.38)',
    fontWeight: '500',
  },
  thumbLabel: {
    marginTop: 3,
    fontSize: 8,
    fontWeight: '600',
    color: c.textMuted,
    letterSpacing: -0.1,
    textAlign: 'center',
    width: THUMB_W,
  },
  thumbLabelOn: {
    color: c.gold,
    fontWeight: '700',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.bgBase,
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
}));

export default function SnapStylesScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const [photoAspect, setPhotoAspect] = useState(DEFAULT_SNAP_PHOTO_ASPECT);
  const [busy, setBusy] = useState(false);
  const [photoDims, setPhotoDims] = useState({ width: 0, height: 0 });

  const previewLayout = useMemo(() => {
    if (photoDims.width === 0 || photoDims.height === 0) return { width: 0, height: 0 };
    return getSnapPreviewLayout({
      photoAspect,
      maxWidth: photoDims.width - spacing.md * 2,
      maxHeight: photoDims.height - spacing.sm * 2,
    });
  }, [photoAspect, photoDims]);

  const handlePhotoLoad = useCallback((event: ImageLoadEventData) => {
    const { width, height } = event.source ?? {};
    if (width > 0 && height > 0) setPhotoAspect(width / height);
  }, []);

  const selectedFilter = filterId ? STORY_FILTERS.find((f) => f.id === filterId) : null;

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

  // All filters grouped by category for the right strip section headers
  const filtersByCategory = useMemo(
    () =>
      STORY_CATEGORIES.map((cat) => ({
        cat,
        filters: STORY_FILTERS.filter((f) => f.category === cat.id),
      })),
    [],
  );

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <View style={styles.flex}>
        <View style={[styles.topBar, { paddingTop: spacing.xs }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color={c.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {returningToReward ? 'Filters for sharing' : 'Style your snap'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Main content: photo (left) + Snapchat-style vertical filter strip (right) */}
        <View style={styles.contentRow}>
          {/* Photo preview — fills remaining width */}
          <View
            style={styles.photoCol}
            onLayout={(e) =>
              setPhotoDims({
                width: e.nativeEvent.layout.width,
                height: e.nativeEvent.layout.height,
              })
            }
          >
            {previewLayout.width > 0 && (
              <>
                <View
                  style={[styles.previewWrap, { width: previewLayout.width, height: previewLayout.height }]}
                >
                  <View
                    ref={captureRefView}
                    collapsable={false}
                    style={[styles.captureBox, { width: previewLayout.width, height: previewLayout.height }]}
                  >
                    <StoryFilterFrame
                      filterId={filterId}
                      width={previewLayout.width}
                      height={previewLayout.height}
                      capturedAt={capturedAt}
                      restaurantName={selectedRestaurantName}
                      city={selectedRestaurantCity}
                      area={selectedRestaurantArea}
                      mediaSlot={
                        hasImage ? (
                          <Image
                            source={{ uri: decodedUri }}
                            style={styles.captureImage}
                            contentFit="cover"
                            contentPosition="bottom"
                            onLoad={handlePhotoLoad}
                          />
                        ) : undefined
                      }
                    />
                  </View>
                  {busy && (
                    <View
                      pointerEvents="none"
                      style={[
                        StyleSheet.absoluteFillObject,
                        {
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(0,0,0,0.35)',
                          borderRadius: borderRadius.xl,
                        },
                      ]}
                    >
                      <ActivityIndicator color={c.gold} size="large" />
                    </View>
                  )}
                </View>
                {selectedFilter && (
                  <View style={styles.filterNameBadge}>
                    <Text style={styles.filterNameText}>{selectedFilter.name}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Snapchat-style right vertical filter strip */}
          <ScrollView
            style={styles.filterStrip}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.filterStripContent}
          >
            {/* Original — no filter */}
            <Pressable
              onPress={() => setFilterId(null)}
              style={({ pressed }) => [pressed && { opacity: 0.82 }]}
            >
              <View style={[styles.thumbCard, !filterId && styles.thumbCardOn]}>
                <LinearGradient
                  colors={['#2c2218', '#100c08']}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.thumbNone}>
                  <Text style={styles.thumbNoneText}>none</Text>
                </View>
              </View>
              <Text style={[styles.thumbLabel, !filterId && styles.thumbLabelOn]} numberOfLines={1}>
                Original
              </Text>
            </Pressable>

            {/* All filters, grouped by category with section labels */}
            {filtersByCategory.map(({ cat, filters }) => (
              <React.Fragment key={cat.id}>
                <Text style={styles.catLabel}>{cat.num}</Text>
                {filters.map((entry) => {
                  const on = entry.id === filterId;
                  const gradient = CATEGORY_GRADIENT[entry.category];
                  return (
                    <Pressable
                      key={entry.id}
                      onPress={() => setFilterId(on ? null : entry.id)}
                      style={({ pressed }) => [pressed && { opacity: 0.82 }]}
                    >
                      <View style={[styles.thumbCard, on && styles.thumbCardOn]}>
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
        </View>

        <View
          style={[
            styles.footer,
            {
              marginBottom: -insets.bottom,
              paddingBottom: spacing.xs,
              paddingHorizontal: spacing.lg,
            },
          ]}
        >
          <Button
            title={returningToReward ? 'Apply & return to share' : 'Continue'}
            onPress={() => void handleContinue()}
            disabled={!hasImage || !restaurantId || busy}
            loading={busy}
            size="lg"
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}
