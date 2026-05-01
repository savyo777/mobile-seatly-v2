import React from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Restaurant } from '@/lib/mock/restaurants';
import { createStyles, borderRadius, spacing, typography, useColors } from '@/lib/theme';
import { formatDistanceMeters } from '@/lib/map/geo';

const CARD_WIDTH = 230;

const useStyles = createStyles((c) => ({
  rail: {
    marginTop: spacing.md,
  },
  content: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgElevated,
    padding: spacing.sm,
  },
  cardActive: {
    borderColor: c.gold,
    backgroundColor: 'rgba(201,168,76,0.12)',
  },
  image: {
    width: 62,
    height: 62,
    borderRadius: borderRadius.md,
    backgroundColor: c.bgSurface,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  name: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '800',
  },
  meta: {
    ...typography.bodySmall,
    color: c.textSecondary,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stat: {
    ...typography.bodySmall,
    color: c.textMuted,
    fontWeight: '700',
  },
}));

export function RestaurantRail({
  restaurants,
  highlightedId,
  onPressRestaurant,
}: {
  restaurants: Array<Restaurant & { distanceMeters?: number }>;
  highlightedId: string | null;
  onPressRestaurant: (restaurant: Restaurant) => void;
}) {
  const c = useColors();
  const styles = useStyles();
  if (!restaurants.length) return null;

  return (
    <FlatList
      horizontal
      style={styles.rail}
      data={restaurants}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => {
        const active = item.id === highlightedId;
        return (
          <Pressable
            onPress={() => onPressRestaurant(item)}
            style={({ pressed }) => [styles.card, active && styles.cardActive, pressed && { opacity: 0.85 }]}
          >
            <Image source={{ uri: item.coverPhotoUrl }} style={styles.image} />
            <View style={styles.body}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.meta} numberOfLines={1}>{item.cuisineType || item.city}</Text>
              <View style={styles.stats}>
                <Ionicons name="star" size={12} color={c.gold} />
                <Text style={styles.stat}>{item.avgRating.toFixed(1)}</Text>
                {typeof item.distanceMeters === 'number' ? (
                  <Text style={styles.stat}>- {formatDistanceMeters(item.distanceMeters)}</Text>
                ) : null}
              </View>
            </View>
          </Pressable>
        );
      }}
    />
  );
}
