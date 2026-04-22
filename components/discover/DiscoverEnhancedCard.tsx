import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Restaurant } from '@/lib/mock/restaurants';
import type { DiscoverBadgeKind } from '@/lib/mock/discoverPresentation';
import { getDiscoverBadges, getUrgencyCopy, shortTagLine } from '@/lib/mock/discoverPresentation';
import { borderRadius, createStyles, shadows, spacing, typography, useColors } from '@/lib/theme';

type Variant = 'carousel' | 'grid';

type Props = {
  restaurant: Restaurant;
  width: number | `${number}%`;
  onPress: () => void;
  variant?: Variant;
  /** Fixed image height for grid cards (helps uniform rows). */
  gridImageHeight?: number;
};

function badgeLabel(t: (k: string) => string, kind: DiscoverBadgeKind): string {
  switch (kind) {
    case 'top_rated':
      return t('discover.badgeTopRated');
    case 'popular':
      return t('discover.badgePopular');
    case 'available_now':
      return t('discover.badgeAvailableNow');
    default:
      return '';
  }
}

const useStyles = createStyles((c) => ({
  card: {
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  cardGrid: {
    flex: 1,
    minWidth: 0,
  },
  cardGridUniform: {
    minHeight: 300,
  },
  starGlyph: {
    fontSize: 13,
    color: c.gold,
    lineHeight: 16,
    marginRight: 2,
    fontWeight: '700',
  },
  bodyGrid: {
    minHeight: 118,
    flexGrow: 1,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.95,
  },
  image: {
    width: '100%',
    backgroundColor: c.bgElevated,
  },
  badgeRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  miniBadge: {
    backgroundColor: 'rgba(10,10,10,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.45)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  miniBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: c.goldLight,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  body: {
    padding: spacing.md,
    gap: 4,
  },
  name: {
    ...typography.bodyLarge,
    color: c.textPrimary,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  rating: {
    ...typography.bodySmall,
    color: c.textPrimary,
    fontWeight: '700',
  },
  reviews: {
    ...typography.bodySmall,
    color: c.textMuted,
  },
  meta: {
    ...typography.bodySmall,
    color: c.textSecondary,
    fontWeight: '500',
  },
  tag: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '600',
    marginTop: 2,
  },
  urgency: {
    ...typography.bodySmall,
    fontSize: 11,
    color: c.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
}));

export function DiscoverEnhancedCard({
  restaurant,
  width,
  onPress,
  variant = 'carousel',
  gridImageHeight,
}: Props) {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const badges = getDiscoverBadges(restaurant);
  const urgency = getUrgencyCopy(restaurant, t);
  const tag = shortTagLine(restaurant);
  const imgHeight =
    variant === 'grid' ? gridImageHeight ?? 112 : 130;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { width },
        variant === 'grid' && styles.cardGrid,
        variant === 'grid' && styles.cardGridUniform,
        pressed && styles.pressed,
      ]}
    >
      <Image source={{ uri: restaurant.coverPhotoUrl }} style={[styles.image, { height: imgHeight }]} />
      <View style={styles.badgeRow}>
        {badges.map((b) => (
          <View key={b} style={styles.miniBadge}>
            <Text style={styles.miniBadgeText}>{badgeLabel(t, b)}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.body, variant === 'grid' && styles.bodyGrid]}>
        <Text style={styles.name} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <View style={styles.ratingRow}>
          <Text style={styles.starGlyph} accessible={false}>
            ★
          </Text>
          <Text style={styles.rating}>{restaurant.avgRating.toFixed(1)}</Text>
          <Text style={styles.reviews}>
            · {t('discover.reviewsCount', { count: restaurant.totalReviews })}
          </Text>
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {restaurant.cuisineType} · {t('discover.kmAway', { distance: restaurant.distanceKm.toFixed(1) })}
        </Text>
        <Text style={styles.tag} numberOfLines={1}>
          {tag}
        </Text>
        <Text style={styles.urgency} numberOfLines={1}>
          {urgency.line}
          {urgency.sub ? ` · ${urgency.sub}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}
