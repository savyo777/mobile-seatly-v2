import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Input, ScreenWrapper } from '@/components/ui';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';
import { snapRestaurants } from '@/lib/mock/snaps';
import { mockReservations } from '@/lib/mock/reservations';
import { Ionicons } from '@expo/vector-icons';

export default function ReviewRestaurantSelectScreen() {
  const router = useRouter();
  const { restaurantId } = useLocalSearchParams<{ restaurantId?: string }>();
  const [query, setQuery] = useState('');

  const filteredRestaurants = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return snapRestaurants;
    return snapRestaurants.filter((restaurant) => {
      const blob = `${restaurant.name} ${restaurant.cuisineType} ${restaurant.area}`.toLowerCase();
      return blob.includes(q);
    });
  }, [query]);

  const recentlyVisited = useMemo(() => {
    const completed = mockReservations
      .filter((r) => r.status === 'completed')
      .sort((a, b) => new Date(b.reservedAt).getTime() - new Date(a.reservedAt).getTime());
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const r of completed) {
      if (!seen.has(r.restaurantId)) {
        seen.add(r.restaurantId);
        ids.push(r.restaurantId);
      }
      if (ids.length >= 3) break;
    }
    return ids
      .map((id) => snapRestaurants.find((restaurant) => restaurant.id === id))
      .filter((restaurant): restaurant is (typeof snapRestaurants)[number] => !!restaurant);
  }, []);

  const openCamera = (restaurantId: string) => {
    router.push(`/(customer)/discover/post-review/camera?restaurantId=${restaurantId}`);
  };

  return (
    <ScreenWrapper scrollable={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>Where are you posting?</Text>
          <Text style={styles.subtitle}>Choose the restaurant this snap is for</Text>
        </View>
        <Input placeholder="Search restaurants" value={query} onChangeText={setQuery} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently visited</Text>
          <View style={styles.list}>
            {recentlyVisited.map((restaurant) => (
              <Pressable
                key={`recent-${restaurant.id}`}
                onPress={() => openCamera(restaurant.id)}
                style={({ pressed }) => [
                  styles.card,
                  styles.recentCard,
                  restaurantId === restaurant.id && styles.selectedCard,
                  pressed && styles.cardPressed,
                ]}
              >
                <Image source={{ uri: restaurant.coverPhotoUrl }} style={styles.image} />
                <View style={styles.overlayChip}>
                  <Ionicons name="time-outline" size={12} color={colors.goldLight} />
                  <Text style={styles.overlayChipText}>Recent</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.name}>{restaurant.name}</Text>
                  <Text style={styles.meta}>
                    {restaurant.area} · {restaurant.cuisineType}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All restaurants</Text>
          <View style={styles.list}>
            {filteredRestaurants.map((restaurant) => (
              <Pressable
                key={restaurant.id}
                onPress={() => openCamera(restaurant.id)}
                style={({ pressed }) => [
                  styles.card,
                  restaurantId === restaurant.id && styles.selectedCard,
                  pressed && styles.cardPressed,
                ]}
              >
                <Image source={{ uri: restaurant.coverPhotoUrl }} style={styles.image} />
                <View style={styles.cardBody}>
                  <Text style={styles.name}>{restaurant.name}</Text>
                  <Text style={styles.meta}>
                    {restaurant.area} · {restaurant.cuisineType}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  header: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  backBtn: {
    marginBottom: spacing.xs,
    alignSelf: 'flex-start',
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.goldLight,
    fontWeight: '700',
  },
  list: {
    gap: spacing.md,
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.28)',
    backgroundColor: '#101010',
    overflow: 'hidden',
  },
  recentCard: {
    borderColor: 'rgba(201, 168, 76, 0.8)',
    shadowColor: colors.gold,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  selectedCard: {
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: colors.bgElevated,
  },
  cardBody: {
    padding: spacing.md,
    gap: 2,
  },
  name: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  meta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  overlayChip: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.7)',
    backgroundColor: 'rgba(10,10,10,0.65)',
  },
  overlayChipText: {
    ...typography.bodySmall,
    color: colors.goldLight,
    fontWeight: '700',
  },
});
