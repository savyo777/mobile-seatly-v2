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
import { Button, ScreenWrapper } from '@/components/ui';
import { StoryFilterFrame } from '@/components/storyFilters/StoryFilterFrame';
import { STORY_FILTERS } from '@/lib/storyFilters/registry';
import {
  STORY_CATEGORIES,
  type StoryFilterCategory,
  type StoryFilterId,
} from '@/lib/storyFilters/types';
import { getSnapRestaurantName } from '@/lib/mock/snaps';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { captureStyledSnapToTmpFile } from '@/lib/snapOverlays/captureStyledSnap';
import {
  DEFAULT_SNAP_PHOTO_ASPECT,
  getSnapPreviewLayout,
} from '@/lib/storyFilters/previewLayout';
import { useColors, createStyles, borderRadius, spacing, typography } from '@/lib/theme';

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
  overlayScroll: {
    maxHeight: 120,
    paddingLeft: spacing.md,
    paddingBottom: spacing.sm,
  },
  overlayChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    marginRight: 8,
    maxWidth: 160,
  },
  overlayChipOn: {
    borderColor: c.gold,
    backgroundColor: 'rgba(201,168,76,0.1)',
  },
  overlayChipText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: c.textSecondary,
  },
  overlayChipTextOn: {
    color: c.gold,
  },
  noneChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.border,
    marginRight: 8,
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
    capturedAt: capturedAtParam,
    returnTo,
    points: pointsParam,
    restaurantName: rewardRestaurantNameParam,
  } = useLocalSearchParams<{
    restaurantId?: string;
    photoUri?: string;
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
    [capturedAt, restaurantId, router],
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
          ...(preservedFilterId
            ? {
                filterId: preservedFilterId,
                capturedAt: String(capturedAt),
              }
            : {}),
        },
      });
    },
    [capturedAt, restaurantId, router, pointsParam, rewardRestaurantNameParam],
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
            style={styles.overlayScroll}
            contentContainerStyle={{ paddingRight: spacing.md }}
          >
            <Pressable
              onPress={() => setFilterId(null)}
              style={[styles.noneChip, !filterId && styles.overlayChipOn]}
            >
              <Text
                style={[
                  styles.overlayChipText,
                  !filterId && styles.overlayChipTextOn,
                ]}
              >
                Original
              </Text>
            </Pressable>
            {filterOptions.map((o) => {
              const on = o.id === filterId;
              return (
                <Pressable
                  key={o.id}
                  onPress={() => setFilterId(o.id)}
                  style={[styles.overlayChip, on && styles.overlayChipOn]}
                >
                  <Text style={[styles.overlayChipText, on && styles.overlayChipTextOn]} numberOfLines={2}>
                    {o.name}
                  </Text>
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
