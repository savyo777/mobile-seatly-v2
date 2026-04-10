import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReviewRestaurantOption } from '@/lib/mock/reviewSnap';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';

interface ReviewRestaurantCardProps {
  restaurant: ReviewRestaurantOption;
  onPress: (id: string) => void;
}

export function ReviewRestaurantCard({ restaurant, onPress }: ReviewRestaurantCardProps) {
  return (
    <Pressable onPress={() => onPress(restaurant.id)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Image source={{ uri: restaurant.imageUrl }} style={styles.image} />
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.name}>{restaurant.name}</Text>
          <View style={styles.statusChip}>
            <Text style={styles.statusText}>{restaurant.status}</Text>
          </View>
        </View>
        <Text style={styles.meta}>{restaurant.area}</Text>
        <Text style={styles.visit}>{restaurant.lastVisitLabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.16)',
    backgroundColor: '#121212',
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgElevated,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  statusChip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.45)',
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
  },
  statusText: {
    ...typography.bodySmall,
    color: colors.goldLight,
    fontWeight: '700',
  },
  meta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  visit: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
});
