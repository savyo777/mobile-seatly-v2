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
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, ScreenWrapper } from '@/components/ui';
import { SnapOverlayLayer } from '@/components/snapOverlays/SnapOverlayLayer';
import {
  SNAP_OVERLAY_CATEGORIES,
  SNAP_OVERLAY_NONE_ID,
  overlaysForCategory,
} from '@/lib/snapOverlays/catalog';
import type { SnapOverlayCategoryId, SnapOverlayContext } from '@/lib/snapOverlays/types';
import { getSnapRestaurantName } from '@/lib/mock/snaps';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { captureStyledSnapToTmpFile } from '@/lib/snapOverlays/captureStyledSnap';
import { useColors, createStyles, borderRadius, spacing, typography } from '@/lib/theme';

function formatBookedTimeLabel(d: Date): string {
  try {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return 'Tonight';
  }
}

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
  subtitle: {
    ...typography.bodySmall,
    color: c.textSecondary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  previewOuter: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  previewWrap: {
    alignSelf: 'center',
    position: 'relative',
  },
  captureBox: {
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
    backgroundColor: '#000',
  },
  captureBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  captureBackdropShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
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
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
}));

export default function SnapStylesScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowW } = useWindowDimensions();
  const captureRefView = useRef<View>(null);

  const {
    restaurantId,
    photoUri,
    partySize: partySizeParam,
    returnTo,
    points: pointsParam,
    restaurantName: rewardRestaurantNameParam,
  } = useLocalSearchParams<{
    restaurantId?: string;
    photoUri?: string;
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

  const restaurant = useMemo(
    () => mockRestaurants.find((r) => r.id === restaurantId),
    [restaurantId],
  );

  const restaurantName = restaurantId ? getSnapRestaurantName(restaurantId) : 'Restaurant';
  const city = restaurant?.city ?? '';
  const area = restaurant?.area ?? '';

  const partySize = Math.min(25, Math.max(1, parseInt(partySizeParam ?? '2', 10) || 2));

  const overlayContext: SnapOverlayContext = useMemo(
    () => ({
      restaurantName,
      city: city || 'Your city',
      area: area || city || 'Neighbourhood',
      bookedTimeLabel: formatBookedTimeLabel(new Date()),
      partySize,
    }),
    [restaurantName, city, area, partySize],
  );

  const previewW = Math.max(1, windowW - spacing.lg * 2);
  const previewH = previewW * (4 / 3);

  const [categoryId, setCategoryId] = useState<SnapOverlayCategoryId>('branded');
  const [overlayId, setOverlayId] = useState<string>(SNAP_OVERLAY_NONE_ID);
  const [reviewTexts, setReviewTexts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const onReviewChange = useCallback((id: string, text: string) => {
    setReviewTexts((prev) => ({ ...prev, [id]: text }));
  }, []);

  const categoryOptions = SNAP_OVERLAY_CATEGORIES;
  const overlayOptions = useMemo(() => overlaysForCategory(categoryId), [categoryId]);

  const goDetails = useCallback(
    async (finalUri: string) => {
      if (!restaurantId) return;
      const href: Href = {
        pathname: '/(customer)/discover/post-review/details',
        params: {
          photoUri: encodeURIComponent(finalUri),
          restaurantId,
        },
      };
      router.push(href);
    },
    [restaurantId, router],
  );

  const goReward = useCallback(
    (finalUri: string) => {
      if (!restaurantId) return;
      router.replace({
        pathname: '/(customer)/discover/post-review/reward',
        params: {
          points: pointsParam ?? '25',
          restaurantName: rewardRestaurantNameParam ?? '',
          restaurantId,
          photoUri: encodeURIComponent(finalUri),
        },
      });
    },
    [restaurantId, router, pointsParam, rewardRestaurantNameParam],
  );

  const handleContinue = useCallback(async () => {
    if (!decodedUri || !restaurantId) {
      Alert.alert('Missing photo', 'Go back and choose a photo first.');
      return;
    }

    const finish = async (finalUri: string) => {
      if (returningToReward) {
        goReward(finalUri);
        return;
      }
      await goDetails(finalUri);
    };

    if (!overlayId || overlayId === SNAP_OVERLAY_NONE_ID) {
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
        Alert.alert(
          'Stickers not flattened',
          'Expo Go cannot bake stickers onto your photo yet. Use a Cenaiva development build for that. Continuing with your original photo.',
        );
        await finish(decodedUri);
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
    overlayId,
    goDetails,
    returningToReward,
    goReward,
  ]);

  const hasImage = decodedUri.length > 0;

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <View style={styles.flex}>
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
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
          <Text style={styles.subtitle}>
            Choose a filter: Cenaiva branded, location, occasion, food, vibe, or review cards. Type on review filters before continuing — with a dev build we bake everything into one image for sharing.
          </Text>

          <View style={styles.previewOuter}>
            <View style={[styles.previewWrap, { width: previewW, height: previewH }]}>
              <View
                ref={captureRefView}
                collapsable={false}
                style={[styles.captureBox, { width: previewW, height: previewH }]}
              >
                {hasImage ? (
                  <>
                    {/* Blurred copy fills the box so we can use contentFit="contain"
                        on the real photo — that preserves the user's exact framing
                        & orientation, no cropping, no stretch, no rotation. */}
                    <Image
                      source={{ uri: decodedUri }}
                      style={styles.captureBackdrop}
                      contentFit="cover"
                      blurRadius={28}
                    />
                    <View style={styles.captureBackdropShade} />
                    <Image
                      source={{ uri: decodedUri }}
                      style={styles.captureImage}
                      contentFit="contain"
                    />
                  </>
                ) : null}
                <SnapOverlayLayer
                  overlayId={overlayId}
                  context={overlayContext}
                  reviewTexts={reviewTexts}
                  onReviewChange={onReviewChange}
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
              onPress={() => setOverlayId(SNAP_OVERLAY_NONE_ID)}
              style={[styles.noneChip, overlayId === SNAP_OVERLAY_NONE_ID && styles.overlayChipOn]}
            >
              <Text
                style={[
                  styles.overlayChipText,
                  overlayId === SNAP_OVERLAY_NONE_ID && styles.overlayChipTextOn,
                ]}
              >
                Original
              </Text>
            </Pressable>
            {overlayOptions.map((o) => {
              const on = o.id === overlayId;
              return (
                <Pressable
                  key={o.id}
                  onPress={() => setOverlayId(o.id)}
                  style={[styles.overlayChip, on && styles.overlayChipOn]}
                >
                  <Text style={[styles.overlayChipText, on && styles.overlayChipTextOn]} numberOfLines={2}>
                    {o.label}
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
              paddingBottom: Math.max(insets.bottom, spacing.md),
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
