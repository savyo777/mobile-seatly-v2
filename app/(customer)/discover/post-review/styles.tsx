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
import { Button, ScreenWrapper } from '@/components/ui';
import { StoryFilterFrame } from '@/components/storyFilters/StoryFilterFrame';
import { STORY_FILTERS } from '@/lib/storyFilters/registry';
import {
  STORY_CATEGORIES,
  type StoryFilterCategory,
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

const CARD_W = 76;
const CARD_H = 102;
const CARD_DESIGN_W = 224;
const CARD_DESIGN_H = 398;
const CARD_SCALE = CARD_W / CARD_DESIGN_W;

const CATEGORY_GRADIENT: Record<StoryFilterCategory, [string, string]> = {
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
  previewOuter: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  previewWrap: {
    alignSelf: 'center',
    position: 'relative',
  },
  captureBox: {
    alignSelf: 'center',
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
  catScroll: {
    maxHeight: 40,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    marginRight: 8,
  },
  catChipOn: {
    borderColor: c.gold,
    backgroundColor: 'rgba(201,168,76,0.12)',
  },
  catChipText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: c.textMuted,
  },
  catChipTextOn: {
    color: c.gold,
  },
  filterCarousel: {
    paddingLeft: spacing.md,
    paddingBottom: spacing.xs,
  },
  filterCarouselContent: {
    paddingRight: spacing.md,
    gap: 10,
    alignItems: 'flex-start',
  },
  filterCard: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#1a140e',
    shadowColor: '#c9784a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  filterCardOn: {
    borderColor: c.gold,
    shadowOpacity: 0.42,
  },
  filterCardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CARD_DESIGN_W,
    height: CARD_DESIGN_H,
    transform: [{ scale: CARD_SCALE }],
    transformOrigin: 'top left',
  },
  filterCardNone: {
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
  filterCardNoneText: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.38)',
    fontWeight: '500',
  },
  filterCardBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.72)',
    zIndex: 10,
  },
  filterCardBadgeBy: {
    fontSize: 7.5,
    fontStyle: 'italic',
    color: 'rgba(58,40,40,0.82)',
    letterSpacing: 0.1,
  },
  filterCardBadgeLabel: {
    fontSize: 7.5,
    fontWeight: '700',
    color: 'rgba(58,40,40,0.82)',
    letterSpacing: 0.3,
  },
  filterCardName: {
    marginTop: 5,
    fontSize: 10.5,
    fontWeight: '600',
    color: c.textPrimary,
    letterSpacing: -0.1,
    width: CARD_W,
  },
  filterCardNameOn: {
    color: c.gold,
    fontWeight: '700',
  },
  filterCardTag: {
    fontSize: 8.5,
    color: c.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 1,
    width: CARD_W,
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
    /** When `reward`, Continue returns to post-reward share screen instead of caption. */
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

  const [categoryId, setCategoryId] = useState<StoryFilterCategory>('cute');
  const [filterId, setFilterId] = useState<StoryFilterId | null>(null);
  const [photoAspect, setPhotoAspect] = useState(DEFAULT_SNAP_PHOTO_ASPECT);
  const [busy, setBusy] = useState(false);

  const previewLayout = getSnapPreviewLayout({
    photoAspect,
    maxWidth: windowW - spacing.lg * 2,
    maxHeight: Math.min(420, Math.max(320, windowH - insets.top - insets.bottom - 280)),
  });
  const previewW = previewLayout.width;
  const previewH = previewLayout.height;

  const categoryOptions = STORY_CATEGORIES;
  const filterOptions = useMemo(
    () => STORY_FILTERS.filter((filter) => filter.category === categoryId),
    [categoryId],
  );

  const handlePhotoLoad = useCallback((event: ImageLoadEventData) => {
    const { width, height } = event.source ?? {};
    if (width > 0 && height > 0) {
      setPhotoAspect(width / height);
    }
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
            ? {
                filterId: preservedFilterId,
                capturedAt: String(capturedAt),
              }
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
            ? {
                filterId: preservedFilterId,
                capturedAt: String(capturedAt),
              }
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
  }, [
    decodedUri,
    restaurantId,
    filterId,
    goDetails,
    returningToReward,
    goReward,
  ]);

  const hasImage = decodedUri.length > 0;

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

        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ paddingBottom: spacing.md }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.previewOuter}>
            <View style={[styles.previewWrap, { width: previewW, height: previewH }]}>
              <View
                ref={captureRefView}
                collapsable={false}
                style={[styles.captureBox, { width: previewW, height: previewH }]}
              >
                <StoryFilterFrame
                  filterId={filterId}
                  width={previewW}
                  height={previewH}
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
              {busy ? (
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
              ) : null}
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.catScroll}
            contentContainerStyle={{ alignItems: 'center', paddingRight: spacing.md }}
          >
            {categoryOptions.map((cat) => {
              const on = cat.id === categoryId;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    setCategoryId(cat.id);
                  }}
                  style={[styles.catChip, on && styles.catChipOn]}
                >
                  <Text style={[styles.catChipText, on && styles.catChipTextOn]}>{cat.title}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterCarousel}
            contentContainerStyle={styles.filterCarouselContent}
          >
            {/* Original — no filter */}
            <Pressable
              onPress={() => setFilterId(null)}
              style={({ pressed }) => [pressed && { opacity: 0.82 }]}
            >
              <View style={[styles.filterCard, !filterId && styles.filterCardOn]}>
                <LinearGradient
                  colors={['#2c2218', '#100c08']}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.filterCardNone}>
                  <Text style={styles.filterCardNoneText}>none</Text>
                </View>
                <View style={styles.filterCardBadge}>
                  <Text style={styles.filterCardBadgeBy}>by </Text>
                  <Text style={styles.filterCardBadgeLabel}>Cenaiva</Text>
                </View>
              </View>
              <Text style={[styles.filterCardName, !filterId && styles.filterCardNameOn]} numberOfLines={1}>
                Original
              </Text>
            </Pressable>

            {filterOptions.map((entry) => {
              const on = entry.id === filterId;
              const gradient = CATEGORY_GRADIENT[entry.category];
              return (
                <Pressable
                  key={entry.id}
                  onPress={() => setFilterId(on ? null : entry.id)}
                  style={({ pressed }) => [pressed && { opacity: 0.82 }]}
                >
                  <View style={[styles.filterCard, on && styles.filterCardOn]}>
                    <LinearGradient
                      colors={gradient}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <View pointerEvents="none" style={styles.filterCardOverlay}>
                      <entry.Component
                        width={CARD_DESIGN_W}
                        height={CARD_DESIGN_H}
                      />
                    </View>
                    <View style={styles.filterCardBadge}>
                      <Text style={styles.filterCardBadgeBy}>by </Text>
                      <Text style={styles.filterCardBadgeLabel}>Cenaiva</Text>
                    </View>
                  </View>
                  <Text style={[styles.filterCardName, on && styles.filterCardNameOn]} numberOfLines={2}>
                    {entry.name}
                  </Text>
                  <Text style={styles.filterCardTag}>{entry.shortLabel}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </ScrollView>

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
