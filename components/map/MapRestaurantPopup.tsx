import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RestaurantWithDistance } from '@/lib/map/mapFilters';
import { NotifyMeButton } from '@/components/customer/NotifyMeButton';
import { borderRadius, createStyles, spacing, typography } from '@/lib/theme';

/**
 * Mobile port of the web app's `MapRestaurantPopup` from
 * `apps/web/src/pages/customer/DiscoverPage.tsx:888-996` of the
 * https://github.com/StevenGeorgy/Seatly repo. Anchored bottom-left
 * of the map. Tapping the card body fires `onOpenPreview`. The
 * heart/bookmark are local-only state for now — the mobile app does
 * not yet have a persistent favorites/saves backend (the existing
 * `lib/mock/social.ts` toggleSave path is demo-mode only). When that
 * arrives, lift `favorite`/`saved` into props.
 *
 * Mobile-specific tradeoffs vs. web parity:
 *   - `Restaurant` has no `badge` or `dietaryTags` field, so those
 *     overlays don't render. The web's `BadgeChip`/`DietaryTagChip`
 *     elements are intentionally omitted rather than stubbed.
 *   - `availableSlots` isn't threaded through `lib/map/mapFilters`,
 *     so the popup always renders the "Booked up tonight" + NotifyMe
 *     branch. Tracked in docs/UNHARDCODE_CHECKLIST.md.
 */

type Props = {
  restaurant: RestaurantWithDistance | null;
  onDismiss: () => void;
  onOpenPreview: () => void;
};

const COVER_HEIGHT = 144;
const POPUP_MAX_WIDTH = 416;

const useStyles = createStyles((c) => ({
  outer: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
    maxWidth: POPUP_MAX_WIDTH,
    zIndex: 20,
    elevation: 20,
  },
  card: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 18,
  },
  coverWrap: {
    position: 'relative',
    width: '100%',
    height: COVER_HEIGHT,
    backgroundColor: c.bgElevated,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,10,10,0.6)',
    borderWidth: 1,
    borderColor: c.border,
  },
  iconBtnActive: {
    borderColor: 'rgba(201,168,76,0.55)',
    backgroundColor: 'rgba(201,168,76,0.18)',
  },
  body: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  name: {
    color: c.textPrimary,
    fontFamily: 'Fraunces',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  priceMeter: {
    color: c.gold,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  priceMeterDim: {
    color: 'rgba(201,168,76,0.35)',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  metaText: {
    ...typography.bodySmall,
    color: c.textSecondary,
  },
  metaDot: {
    color: c.textMuted,
    fontSize: 12,
  },
  bookedLabel: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginBottom: spacing.xs,
  },
}));

function priceMeterChars(level: number): { filled: string; dim: string } {
  const safe = Math.max(0, Math.min(3, Math.round(level)));
  return { filled: '$'.repeat(safe), dim: '$'.repeat(3 - safe) };
}

function IconActionButton({
  iconName,
  active,
  label,
  onPress,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  label: string;
  onPress: (event: GestureResponderEvent) => void;
}) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={(event) => {
        // Don't bubble to the card body's onOpenPreview.
        event.stopPropagation();
        onPress(event);
      }}
      style={[styles.iconBtn, active && styles.iconBtnActive]}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
    >
      <Ionicons name={iconName} size={18} color={active ? '#F5E6C8' : '#FFFFFF'} />
    </Pressable>
  );
}

export function MapRestaurantPopup({ restaurant, onDismiss, onOpenPreview }: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [favorite, setFavorite] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const visible = !!restaurant;
    Animated.parallel([
      Animated.spring(slide, {
        toValue: visible ? 1 : 0,
        friction: 9,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: visible ? 200 : 140,
        useNativeDriver: true,
      }),
    ]).start();
  }, [restaurant, slide, opacity]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  if (!restaurant) {
    return null;
  }

  const cover = restaurant.coverPhotoUrl?.trim();
  const meter = priceMeterChars(restaurant.priceRange);

  return (
    <Animated.View
      style={[
        styles.outer,
        {
          paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm,
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="auto"
    >
      <Pressable
        style={styles.card}
        onPress={onOpenPreview}
        accessibilityRole="button"
        accessibilityLabel={`Open ${restaurant.name} preview`}
      >
        <View style={styles.coverWrap}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" transition={120} />
          ) : (
            <View style={styles.coverFallback}>
              <Ionicons name="restaurant-outline" size={36} color="#C9A84C" />
            </View>
          )}
          <View style={styles.actionRow}>
            <IconActionButton
              iconName={favorite ? 'heart' : 'heart-outline'}
              active={favorite}
              label="Favorite restaurant"
              onPress={() => setFavorite((v) => !v)}
            />
            <IconActionButton
              iconName={saved ? 'bookmark' : 'bookmark-outline'}
              active={saved}
              label="Save restaurant"
              onPress={() => setSaved((v) => !v)}
            />
            <IconActionButton iconName="close" label="Close" onPress={onDismiss} />
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>
            {restaurant.name}
          </Text>
          <View style={styles.metaRow}>
            <Text>
              <Text style={styles.priceMeter}>{meter.filled}</Text>
              <Text style={styles.priceMeterDim}>{meter.dim}</Text>
            </Text>
            {restaurant.cuisineType ? (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText} numberOfLines={1}>
                  {restaurant.cuisineType}
                </Text>
              </>
            ) : null}
            {restaurant.area ? (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText} numberOfLines={1}>
                  {restaurant.area}
                </Text>
              </>
            ) : null}
          </View>

          {/* Slot rail not yet wired into lib/map/mapFilters; always show the
              "Booked up tonight" + NotifyMe path until availableSlots is
              threaded. Tracked in docs/UNHARDCODE_CHECKLIST.md. */}
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Text style={styles.bookedLabel}>Booked up tonight.</Text>
            <NotifyMeButton
              variant="restaurant"
              restaurantId={restaurant.id}
              restaurantName={restaurant.name}
              restaurantSlug={restaurant.slug}
            />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

