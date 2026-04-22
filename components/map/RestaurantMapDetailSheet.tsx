import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Badge } from '@/components/ui';
import { formatDistanceMeters } from '@/lib/map/geo';
import type { RestaurantWithDistance } from '@/lib/map/mapFilters';
import { useColors, createStyles, spacing, borderRadius, typography, shadows } from '@/lib/theme';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_MAX = Math.min(SCREEN_H * 0.5, 400);

type Props = {
  restaurant: RestaurantWithDistance | null;
  onDismiss: () => void;
  onBook: () => void;
  onViewDetails: () => void;
  onAskAi: () => void;
};

function priceTierLabel(range: number): string {
  return '$'.repeat(Math.min(4, Math.max(1, range))) as string;
}

function availabilityVariant(
  a: RestaurantWithDistance['availability'],
): 'gold' | 'success' | 'warning' | 'danger' | 'info' | 'muted' {
  switch (a) {
    case 'Available Tonight':
      return 'success';
    case 'Top Rated':
      return 'gold';
    case 'Popular':
      return 'info';
    default:
      return 'muted';
  }
}

const useStyles = createStyles((c) => ({
  sheetOuter: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
    zIndex: 20,
  },
  sheetGlow: {
    position: 'absolute',
    left: -2,
    right: -2,
    top: -16,
    height: 48,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  sheet: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: 1.5,
    borderColor: c.border,
    overflow: 'hidden',
    ...shadows.card,
    elevation: 18,
  },
  handleRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handleHit: {
    alignItems: 'center',
    width: 88,
    height: 24,
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
  },
  closeBtn: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.xs,
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(36,36,36,0.92)',
    borderWidth: 1,
    borderColor: c.border,
    zIndex: 40,
    elevation: 40,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  heroRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgElevated,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.h3,
    color: c.textPrimary,
    fontWeight: '700',
  },
  meta: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  starGlyph: {
    fontSize: 14,
    lineHeight: 16,
    color: c.gold,
    fontWeight: '700',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: c.textMuted,
    marginHorizontal: spacing.xs,
  },
  statText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    fontWeight: '600',
  },
  topTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  pricePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.45)',
    backgroundColor: 'rgba(201,168,76,0.1)',
  },
  priceText: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '700',
  },
  descriptor: {
    ...typography.bodySmall,
    color: c.goldLight,
    fontWeight: '600',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tagPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgElevated,
  },
  tagText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    fontWeight: '600',
  },
  actions: {
    gap: spacing.sm,
  },
  askAiButton: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  askAiText: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '700',
  },
}));

export function RestaurantMapDetailSheet({
  restaurant,
  onDismiss,
  onBook,
  onViewDetails,
  onAskAi,
}: Props) {
  const c = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const visible = !!restaurant;
    Animated.parallel([
      Animated.spring(slide, {
        toValue: visible ? 1 : 0,
        friction: 9,
        tension: 48,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: visible ? 220 : 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, [restaurant, slide, opacity]);

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_MAX * 0.42, 0],
  });

  if (!restaurant) {
    return null;
  }

  const distLabel = formatDistanceMeters(restaurant.distanceMeters);

  return (
    <Animated.View
      style={[
        styles.sheetOuter,
        {
          paddingBottom: Math.max(insets.bottom, spacing.md),
          maxHeight: SHEET_MAX + insets.bottom,
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="box-none"
    >
      <LinearGradient
        colors={['rgba(201, 168, 76, 0.35)', 'rgba(201, 168, 76, 0)', 'transparent']}
        locations={[0, 0.35, 1]}
        style={styles.sheetGlow}
        pointerEvents="none"
      />

      <View style={styles.sheet}>
        <View style={styles.handleRow}>
          <Pressable onPress={onDismiss} hitSlop={10} style={styles.handleHit} accessibilityRole="button">
            <View style={styles.handle} />
          </Pressable>
        </View>

        <Pressable
          onPress={onDismiss}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close details"
          hitSlop={8}
        >
          <Ionicons name="close" size={19} color={c.textPrimary} />
        </Pressable>

        <View style={styles.content}>
          <View style={styles.heroRow}>
            <Image source={{ uri: restaurant.coverPhotoUrl }} style={styles.thumb} />
            <View style={styles.heroText}>
              <Text style={styles.name} numberOfLines={1}>
                {restaurant.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {restaurant.cuisineType} · {restaurant.area}
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.starGlyph} accessible={false}>
                    ★
                  </Text>
                  <Text style={styles.statText}>
                    {restaurant.avgRating.toFixed(1)} ({restaurant.totalReviews})
                  </Text>
                </View>
                <View style={styles.dot} />
                <View style={styles.stat}>
                  <Ionicons name="navigate-outline" size={14} color={c.textSecondary} />
                  <Text style={styles.statText}>{distLabel} away</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.topTagsRow}>
            <Badge label={restaurant.availability} variant={availabilityVariant(restaurant.availability)} size="sm" />
            <View style={styles.pricePill}>
              <Text style={styles.priceText}>{priceTierLabel(restaurant.priceRange)}</Text>
            </View>
          </View>

          <Text style={styles.descriptor} numberOfLines={2}>
            {restaurant.ambiance}
          </Text>

          <View style={styles.tagsRow}>
            {restaurant.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagText} numberOfLines={1}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <Button title={t('mapScreen.bookNow')} onPress={onBook} size="md" />
            <Button title={t('mapScreen.viewDetails')} onPress={onViewDetails} size="md" variant="outlined" />
            <Pressable onPress={onAskAi} style={styles.askAiButton} accessibilityRole="button">
              <Text style={styles.askAiText}>{t('mapScreen.askAi')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
