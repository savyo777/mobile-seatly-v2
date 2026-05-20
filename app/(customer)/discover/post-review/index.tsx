import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Input, ScreenWrapper } from '@/components/ui';
import { useColors, createStyles, borderRadius, spacing, typography } from '@/lib/theme';
import { safeRouterBack } from '@/lib/navigation/transitions';
import { snapRestaurants as DEMO_SNAP_RESTAURANTS } from '@/lib/mock/snaps';
import { mockReservations as DEMO_RESERVATIONS } from '@/lib/mock/reservations';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { loadRestaurantsForDiscover } from '@/lib/data/restaurantCatalog';
import { fetchRecentlyVisitedRestaurants, type RecentRestaurant } from '@/lib/snaps/recentlyVisitedApi';
import type { Restaurant } from '@/lib/mock/restaurants';
import { Ionicons } from '@expo/vector-icons';

const useStyles = createStyles((c) => ({
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
    color: c.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: c.textSecondary,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.body,
    color: '#DDD5C4',
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
    shadowColor: '#C9A84C',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  selectedCard: {
    borderColor: c.gold,
    shadowColor: c.gold,
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
    backgroundColor: c.bgElevated,
  },
  cardBody: {
    padding: spacing.md,
    gap: 2,
  },
  name: {
    ...typography.bodyLarge,
    color: c.textPrimary,
    fontWeight: '700',
  },
  meta: {
    ...typography.bodySmall,
    color: c.textSecondary,
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
    color: '#DDD5C4',
    fontWeight: '700',
  },
  centered: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
}));

// ---------- demo helpers (unchanged) ----------

function getDemoRecentlyVisited(): typeof DEMO_SNAP_RESTAURANTS {
  const completed = DEMO_RESERVATIONS
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
    .map((id) => DEMO_SNAP_RESTAURANTS.find((restaurant) => restaurant.id === id))
    .filter((restaurant): restaurant is (typeof DEMO_SNAP_RESTAURANTS)[number] => !!restaurant);
}

// ---------- screen ----------

export default function ReviewRestaurantSelectScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const {
    restaurantId,
    photoUri,
    capturedAt,
    filterId,
    bookingId,
  } = useLocalSearchParams<{
    restaurantId?: string;
    photoUri?: string;
    capturedAt?: string;
    filterId?: string;
    bookingId?: string;
  }>();
  // Post-capture mode: camera passed a photo through and we just need to
  // pick which restaurant to attach it to. In that mode the tap target is
  // /details (with all params chained through); otherwise (legacy entry
  // path, e.g. an old deep link) we keep the original behavior and push
  // to /camera with the picked restaurantId.
  const postCaptureMode = Boolean(photoUri);
  const [query, setQuery] = useState('');

  // Real-mode state
  const [recentRestaurants, setRecentRestaurants] = useState<RecentRestaurant[]>([]);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(!isDemoModeEnabled());

  useEffect(() => {
    if (isDemoModeEnabled()) return;
    let cancelled = false;
    Promise.all([
      fetchRecentlyVisitedRestaurants(),
      loadRestaurantsForDiscover().then((result) => result.list),
    ])
      .then(([recent, all]) => {
        if (cancelled) return;
        setRecentRestaurants(recent);
        setAllRestaurants(all);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Demo-mode derived values
  const demoRecentlyVisited = useMemo(
    () => isDemoModeEnabled() ? getDemoRecentlyVisited() : [],
    [],
  );

  const pickRestaurant = (id: string) => {
    if (postCaptureMode && photoUri) {
      const photoQuery = `photoUri=${encodeURIComponent(photoUri)}`;
      const capturedAtQuery = capturedAt ? `&capturedAt=${encodeURIComponent(capturedAt)}` : '';
      const filterQuery = filterId ? `&filterId=${encodeURIComponent(filterId)}` : '';
      const bookingQuery = bookingId ? `&bookingId=${encodeURIComponent(bookingId)}` : '';
      router.push(
        `/(customer)/discover/post-review/details?${photoQuery}&restaurantId=${id}${capturedAtQuery}${filterQuery}${bookingQuery}`,
      );
      return;
    }
    // Legacy entry path (no photo yet) — fall back to the original
    // restaurant → camera flow so any deep link still works.
    router.push(`/(customer)/discover/post-review/camera?restaurantId=${id}`);
  };

  // ---------- real-mode filtered list ----------
  const filteredReal = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRestaurants;
    return allRestaurants.filter((r) => {
      const blob = `${r.name} ${r.cuisineType} ${r.area} ${r.city}`.toLowerCase();
      return blob.includes(q);
    });
  }, [query, allRestaurants]);

  // ---------- demo-mode filtered list ----------
  const filteredDemo = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DEMO_SNAP_RESTAURANTS;
    return DEMO_SNAP_RESTAURANTS.filter((r) => {
      const blob = `${r.name} ${r.cuisineType} ${r.area}`.toLowerCase();
      return blob.includes(q);
    });
  }, [query]);

  const isDemo = isDemoModeEnabled();
  const recentList = isDemo ? demoRecentlyVisited : recentRestaurants;
  const allList = isDemo ? filteredDemo : filteredReal;

  return (
    <ScreenWrapper scrollable={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            onPress={() =>
              safeRouterBack(
                router,
                postCaptureMode
                  ? '/(customer)/discover/post-review/camera'
                  : '/(customer)/discover',
              )
            }
            hitSlop={10}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={22} color={c.textPrimary} />
          </Pressable>
          <Text style={styles.title}>
            {postCaptureMode ? 'Pick a restaurant' : 'Where are you posting?'}
          </Text>
          <Text style={styles.subtitle}>
            {postCaptureMode
              ? 'Where did you snap this?'
              : 'Choose the restaurant this snap is for'}
          </Text>
        </View>

        <Input placeholder="Search restaurants" value={query} onChangeText={setQuery} inputKind="search" />

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={c.gold} />
          </View>
        ) : (
          <>
            {recentList.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recently visited</Text>
                <View style={styles.list}>
                  {isDemo
                    ? demoRecentlyVisited.map((restaurant) => (
                        <Pressable
                          key={`recent-${restaurant.id}`}
                          onPress={() => pickRestaurant(restaurant.id)}
                          style={({ pressed }) => [
                            styles.card,
                            styles.recentCard,
                            restaurantId === restaurant.id && styles.selectedCard,
                            pressed && styles.cardPressed,
                          ]}
                        >
                          <Image source={{ uri: restaurant.coverPhotoUrl }} style={styles.image} />
                          <View style={styles.overlayChip}>
                            <Ionicons name="time-outline" size={12} color="#DDD5C4" />
                            <Text style={styles.overlayChipText}>Recent</Text>
                          </View>
                          <View style={styles.cardBody}>
                            <Text style={styles.name}>{restaurant.name}</Text>
                            <Text style={styles.meta}>
                              {restaurant.area} · {restaurant.cuisineType}
                            </Text>
                          </View>
                        </Pressable>
                      ))
                    : recentRestaurants.map((restaurant) => (
                        <Pressable
                          key={`recent-${restaurant.restaurantId}`}
                          onPress={() => pickRestaurant(restaurant.restaurantId)}
                          style={({ pressed }) => [
                            styles.card,
                            styles.recentCard,
                            restaurantId === restaurant.restaurantId && styles.selectedCard,
                            pressed && styles.cardPressed,
                          ]}
                        >
                          {restaurant.coverPhotoUrl ? (
                            <Image source={{ uri: restaurant.coverPhotoUrl }} style={styles.image} />
                          ) : (
                            <View style={styles.image} />
                          )}
                          <View style={styles.overlayChip}>
                            <Ionicons name="time-outline" size={12} color="#DDD5C4" />
                            <Text style={styles.overlayChipText}>Recent</Text>
                          </View>
                          <View style={styles.cardBody}>
                            <Text style={styles.name}>{restaurant.restaurantName}</Text>
                            <Text style={styles.meta}>
                              {[restaurant.city, restaurant.cuisineType].filter(Boolean).join(' · ')}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>All restaurants</Text>
              <View style={styles.list}>
                {isDemo
                  ? filteredDemo.map((restaurant) => (
                      <Pressable
                        key={restaurant.id}
                        onPress={() => pickRestaurant(restaurant.id)}
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
                    ))
                  : filteredReal.map((restaurant) => (
                      <Pressable
                        key={restaurant.id}
                        onPress={() => pickRestaurant(restaurant.id)}
                        style={({ pressed }) => [
                          styles.card,
                          restaurantId === restaurant.id && styles.selectedCard,
                          pressed && styles.cardPressed,
                        ]}
                      >
                        {restaurant.coverPhotoUrl ? (
                          <Image source={{ uri: restaurant.coverPhotoUrl }} style={styles.image} />
                        ) : (
                          <View style={styles.image} />
                        )}
                        <View style={styles.cardBody}>
                          <Text style={styles.name}>{restaurant.name}</Text>
                          <Text style={styles.meta}>
                            {[restaurant.area || restaurant.city, restaurant.cuisineType].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
