import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Restaurant } from '@/lib/mock/restaurants';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/theme';

type Props = {
  restaurant: Restaurant;
  onPress?: () => void;
};

export function SavedRestaurantCard({ restaurant, onPress }: Props) {
  const content = (
    <View style={styles.card}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: restaurant.coverPhotoUrl }} style={styles.image} resizeMode="cover" />
        <View style={styles.imageOverlay} />
        <View style={styles.badgeRow}>
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color={colors.gold} />
            <Text style={styles.ratingText}>{restaurant.avgRating.toFixed(1)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <Text style={styles.cuisine} numberOfLines={1}>
          {restaurant.cuisineType}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.distance}>{restaurant.distanceKm.toFixed(1)} km</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.desc} numberOfLines={2}>
            {restaurant.description}
          </Text>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.cardPressed]}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  cardPressed: {
    opacity: 0.92,
  },
  imageWrap: {
    height: 120,
    width: '100%',
    position: 'relative',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  badgeRow: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(10,10,10,0.75)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.4)',
  },
  ratingText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  body: {
    padding: spacing.md,
  },
  name: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  cuisine: {
    ...typography.bodySmall,
    color: colors.gold,
    marginTop: 2,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    gap: 6,
  },
  distance: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dot: {
    color: colors.textMuted,
    marginTop: 0,
  },
  desc: {
    ...typography.bodySmall,
    color: colors.textMuted,
    flex: 1,
  },
});
