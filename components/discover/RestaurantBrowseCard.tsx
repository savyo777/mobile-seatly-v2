import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { Restaurant } from '@/lib/mock/restaurants';

interface RestaurantBrowseCardProps {
  restaurant: Restaurant;
  width: number;
  onPress: () => void;
}

export function RestaurantBrowseCard({ restaurant, width, onPress }: RestaurantBrowseCardProps) {
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
            <Ionicons name="star" size={13} color={colors.gold} />
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  image: {
    width: '100%',
    height: 122,
    backgroundColor: colors.bgElevated,
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(10,10,10,0.78)',
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 10,
    color: colors.goldLight,
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
    color: colors.textPrimary,
    fontWeight: '600',
  },
  meta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
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
  rating: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  reviews: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  price: {
    ...typography.body,
    color: colors.gold,
    fontWeight: '700',
  },
  ambiance: {
    ...typography.bodySmall,
    color: colors.goldLight,
    marginTop: 2,
  },
});
