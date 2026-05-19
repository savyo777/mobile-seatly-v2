import React, { useEffect, useMemo, useRef } from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Restaurant } from '@/lib/mock/restaurants';
import { restaurantPriceLabel } from '@/lib/restaurants/pricing';
import { createStyles, borderRadius, spacing, typography } from '@/lib/theme';

const CARD_WIDTH = 208;
type RailRestaurant = Restaurant & { distanceMeters?: number };

const useStyles = createStyles(() => ({
  rail: {
    backgroundColor: '#0D0D0D',
  },
  content: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: '#141414',
    overflow: 'hidden',
  },
  cardActive: {
    borderColor: '#C8A951',
    shadowColor: '#C8A951',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  image: {
    width: '100%',
    height: 112,
    backgroundColor: '#000000',
  },
  imageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: '#C8A951',
  },
  body: {
    padding: spacing.sm,
  },
  name: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    ...typography.bodySmall,
    color: '#C8A951',
    fontWeight: '600',
  },
  price: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  priceText: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.62)',
    fontWeight: '700',
  },
  city: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 1,
  },
  cityText: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.50)',
    flexShrink: 1,
  },
  cuisine: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 2,
  },
}));

export function RestaurantRail({
  restaurants,
  highlightedId,
  onPressRestaurant,
}: {
  restaurants: RailRestaurant[];
  highlightedId: string | null;
  onPressRestaurant: (restaurant: Restaurant) => void;
}) {
  const styles = useStyles();
  const listRef = useRef<FlatList<RailRestaurant>>(null);
  const restaurantOrderKey = useMemo(
    () => restaurants.map((restaurant) => restaurant.id).join('|'),
    [restaurants],
  );

  useEffect(() => {
    if (!restaurants.length) return;
    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [restaurantOrderKey, restaurants.length]);

  if (!restaurants.length) return null;

  return (
    <FlatList
      ref={listRef}
      horizontal
      style={styles.rail}
      data={restaurants}
      extraData={highlightedId}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => {
        const active = item.id === highlightedId;
        const imageUrl = item.coverPhotoUrl?.trim();
        return (
          <Pressable
            onPress={() => onPressRestaurant(item)}
            style={({ pressed }) => [
              styles.card,
              active && styles.cardActive,
              pressed && { opacity: 0.86, transform: [{ scale: 0.98 }] },
            ]}
          >
            <View>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.image} />
              ) : (
                // No cover photo → plain black tile. Previously rendered a
                // cuisine emoji as a placeholder, but on devices missing the
                // emoji glyphs (e.g. iOS sim with the stock font set) it
                // rendered as the `[?]` unknown-glyph box, which read as a
                // broken-image placeholder. Per the user's UX rule: empty
                // image slot = black, never a glyph.
                <View style={styles.image} />
              )}
              {active ? <View style={styles.imageOverlay} /> : null}
            </View>
            <View style={styles.body}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <View style={styles.metaRow}>
                <View style={styles.rating}>
                  <Ionicons name="star" size={12} color="#C8A951" />
                  <Text style={styles.ratingText}>{item.avgRating?.toFixed(1) ?? 'New'}</Text>
                </View>
                <View style={styles.price}>
                  <Ionicons name="cash-outline" size={12} color="rgba(255,255,255,0.58)" />
                  <Text style={styles.priceText}>{restaurantPriceLabel(item.priceRange)}</Text>
                </View>
                {item.city ? (
                  <View style={styles.city}>
                    <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.50)" />
                    <Text style={styles.cityText} numberOfLines={1}>{item.city}</Text>
                  </View>
                ) : null}
              </View>
              {item.cuisineType ? (
                <Text style={styles.cuisine} numberOfLines={1}>{item.cuisineType}</Text>
              ) : null}
            </View>
          </Pressable>
        );
      }}
    />
  );
}
