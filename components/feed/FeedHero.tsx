import React from 'react';
import { View, Text, StyleSheet, ImageBackground, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { Restaurant } from '@/lib/mock/restaurants';
import { useColors, createStyles, spacing, borderRadius, shadows } from '@/lib/theme';

interface Props {
  restaurant: Restaurant;
  onPressCard: () => void;
  onPressReserve: () => void;
}

const PRICE_LABELS = ['', '$', '$$', '$$$', '$$$$'];

const useStyles = createStyles((c) => ({
  wrap: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  card: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201,162,74,0.28)',
    ...shadows.card,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.95,
  },
  image: {
    height: 290,
    justifyContent: 'space-between',
  },
  imageRadius: {
    borderRadius: borderRadius.xl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: spacing.md,
  },
  pickBadge: {
    backgroundColor: 'rgba(201,162,74,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  pickBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: c.bgBase,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.gold,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  ratingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: c.bgBase,
  },
  bottom: {
    padding: spacing.lg,
    gap: 4,
  },
  cuisine: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  ambiance: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.sm,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    backgroundColor: c.gold,
    paddingVertical: 11,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    marginTop: 4,
    ...shadows.goldGlow,
  },
  ctaPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '800',
    color: c.bgBase,
  },
}));

export function FeedHero({ restaurant, onPressCard, onPressReserve }: Props) {
  const c = useColors();
  const styles = useStyles();

  return (
    <View style={styles.wrap}>
      <Pressable onPress={onPressCard} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        <ImageBackground
          source={{ uri: restaurant.coverPhotoUrl }}
          style={styles.image}
          imageStyle={styles.imageRadius}
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.92)']}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.topRow}>
            <View style={styles.pickBadge}>
              <Text style={styles.pickBadgeText}>TONIGHT'S PICK</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={10} color={c.bgBase} />
              <Text style={styles.ratingBadgeText}>{restaurant.avgRating.toFixed(1)}</Text>
            </View>
          </View>

          <View style={styles.bottom}>
            <Text style={styles.cuisine}>
              {restaurant.cuisineType.toUpperCase()} · {PRICE_LABELS[restaurant.priceRange]} · {restaurant.distanceKm.toFixed(1)} km
            </Text>
            <Text style={styles.name} numberOfLines={2}>{restaurant.name}</Text>
            <Text style={styles.ambiance} numberOfLines={1}>{restaurant.ambiance}</Text>
            <Pressable
              onPress={onPressReserve}
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            >
              <Ionicons name="calendar-outline" size={14} color={c.bgBase} />
              <Text style={styles.ctaText}>Reserve a table</Text>
            </Pressable>
          </View>
        </ImageBackground>
      </Pressable>
    </View>
  );
}
