import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { borderRadius, createStyles, shadows, spacing, typography } from '@/lib/theme';
import { Restaurant } from '@/lib/mock/restaurants';

interface RestaurantBrowseCardProps {
  restaurant: Restaurant;
  width: number;
  onPress: () => void;
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
  image: {
    width: '100%',
    height: 122,
    backgroundColor: c.bgElevated,
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(10,10,10,0.78)',
    borderColor: c.gold,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 10,
    color: c.goldLight,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  name: {
    ...typography.bodyLarge,
    color: c.textPrimary,
    fontWeight: '600',
  },
  meta: {
    ...typography.bodySmall,
    color: c.textSecondary,
  },
  infoRow: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starGlyph: {
    fontSize: 13,
    lineHeight: 15,
    color: c.gold,
    fontWeight: '700',
  },
  rating: {
    ...typography.bodySmall,
    color: c.textPrimary,
    fontWeight: '600',
  },
  reviews: {
    ...typography.bodySmall,
    color: c.textMuted,
  },
  price: {
    ...typography.body,
    color: c.gold,
    fontWeight: '700',
  },
  ambiance: {
    ...typography.bodySmall,
    color: c.goldLight,
    marginTop: 2,
  },
}));

export function RestaurantBrowseCard({ restaurant, width, onPress }: RestaurantBrowseCardProps) {
  const styles = useStyles();
  return (
    <Pressable style={[styles.card, { width }]} onPress={onPress}>
      <Image source={{ uri: restaurant.coverPhotoUrl }} style={styles.image} />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{restaurant.availability}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {restaurant.cuisineType} · {restaurant.area}
        </Text>
        <View style={styles.infoRow}>
          <View style={styles.ratingRow}>
            <Text style={styles.starGlyph} accessible={false}>
              ★
            </Text>
            <Text style={styles.rating}>{restaurant.avgRating.toFixed(1)}</Text>
            <Text style={styles.reviews}>({restaurant.totalReviews})</Text>
          </View>
          <Text style={styles.price}>{'$'.repeat(restaurant.priceRange)}</Text>
        </View>
        <Text style={styles.ambiance} numberOfLines={1}>
          {restaurant.ambiance}
        </Text>
      </View>
    </Pressable>
  );
}
