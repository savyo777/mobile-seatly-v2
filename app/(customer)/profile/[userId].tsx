import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams, Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getSnapUser, listSnapPostsByUser, type SnapPost } from '@/lib/mock/snaps';
import { isFollowing, follow, unfollow } from '@/lib/mock/social';
import { mockReservations } from '@/lib/mock/reservations';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { mockCustomer } from '@/lib/mock/users';
import { colors, spacing, borderRadius } from '@/lib/theme';

const SCREEN_W = Dimensions.get('window').width;
const COL_GAP = 2;
const THUMB = (SCREEN_W - COL_GAP) / 2;
const ME = mockCustomer.id;

type TabKey = 'snaps' | 'visited';

function getTopCuisines(userId: string): string[] {
  const userReservations = mockReservations.filter(
    (r) => r.guestId === userId && r.status === 'completed',
  );
  const counts: Record<string, number> = {};
  userReservations.forEach((r) => {
    const restaurant = mockRestaurants.find((rest) => rest.id === r.restaurantId);
    if (restaurant) {
      const base = restaurant.cuisineType.split(' ')[0];
      counts[base] = (counts[base] ?? 0) + 1;
    }
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cuisine]) => cuisine);
}

function getVisitedRestaurants(userId: string) {
  const completed = mockReservations
    .filter((r) => r.guestId === userId && r.status === 'completed')
    .sort((a, b) => new Date(b.reservedAt).getTime() - new Date(a.reservedAt).getTime());
  const seen = new Set<string>();
  const result: typeof mockRestaurants = [];
  for (const r of completed) {
    if (!seen.has(r.restaurantId)) {
      seen.add(r.restaurantId);
      const rest = mockRestaurants.find((rest) => rest.id === r.restaurantId);
      if (rest) result.push(rest);
    }
  }
  return result;
}

export default function PublicProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, from } = useLocalSearchParams<{ userId: string; from?: string }>();

  const handleBack = useCallback(() => {
    if (from === 'notifications') {
      router.push('/(customer)/notifications' as Href);
    } else {
      router.back();
    }
  }, [from, router]);

  const user = getSnapUser(userId ?? '');
  const posts = listSnapPostsByUser(userId ?? '');
  const [tab, setTab] = useState<TabKey>('snaps');
  const [following, setFollowing] = useState(() => isFollowing(ME, userId ?? ''));

  const visitedRestaurants = useMemo(() => getVisitedRestaurants('g1'), []);
  const topCuisines = useMemo(() => getTopCuisines('g1'), []);

  const handleFollow = () => {
    if (following) unfollow(ME, userId ?? '');
    else follow(ME, userId ?? '');
    setFollowing((f) => !f);
  };

  const renderSnap = useCallback(
    ({ item, index }: { item: SnapPost; index: number }) => (
      <Pressable
        onPress={() => router.push(`/(customer)/discover/snaps/detail/${item.id}` as Href)}
        style={[styles.snapThumb, index % 2 === 0 && { marginRight: COL_GAP }]}
      >
        <Image source={{ uri: item.image }} style={styles.snapImg} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)']}
          style={styles.snapGradient}
        />
      </Pressable>
    ),
    [router],
  );

  const renderVisited = useCallback(
    ({ item }: { item: typeof mockRestaurants[number] }) => (
      <Pressable
        onPress={() => router.push(`/(customer)/discover/${item.id}` as Href)}
        style={({ pressed }) => [styles.visitCard, pressed && { opacity: 0.85 }]}
      >
        <Image source={{ uri: item.coverPhotoUrl }} style={styles.visitPhoto} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.75)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.visitInfo}>
          <Text style={styles.visitName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.visitCuisine}>{item.cuisineType}</Text>
        </View>
      </Pressable>
    ),
    [router],
  );

  const Header = useCallback(
    () => (
      <View>
        {/* Back nav */}
        <View style={[styles.topNav, { paddingTop: insets.top + 4 }]}>
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Avatar + identity */}
        <View style={styles.identity}>
          <View style={styles.avatarRing}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={32} color={colors.textMuted} />
              </View>
            )}
          </View>
          <Text style={styles.displayName}>{user?.username ?? userId}</Text>

          {/* Cuisine tags */}
          {topCuisines.length > 0 && (
            <View style={styles.cuisineRow}>
              {topCuisines.map((c) => (
                <View key={c} style={styles.cuisineChip}>
                  <Text style={styles.cuisineChipText}>{c}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Dining stats — no social counts */}
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>
              <Text style={styles.statsNum}>{posts.length}</Text>
              <Text style={styles.statsDivider}>  Snaps  ·  </Text>
              <Text style={styles.statsNum}>{visitedRestaurants.length}</Text>
              <Text style={styles.statsDivider}>  Places visited</Text>
            </Text>
          </View>

          {/* Follow CTA */}
          <Pressable
            onPress={handleFollow}
            style={({ pressed }) => [
              styles.followBtn,
              following && styles.followBtnActive,
              pressed && { opacity: 0.8 },
            ]}
          >
            {following && (
              <Ionicons name="checkmark" size={14} color={colors.gold} style={{ marginRight: 4 }} />
            )}
            <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
              {following ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
        </View>

        {/* Tab toggle */}
        <View style={styles.tabs}>
          {(['snaps', 'visited'] as TabKey[]).map((key) => {
            const active = tab === key;
            const label = key === 'snaps' ? 'Snaps' : 'Places Visited';
            return (
              <Pressable key={key} onPress={() => setTab(key)} style={styles.tab}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
                {active && <View style={styles.tabUnderline} />}
              </Pressable>
            );
          })}
        </View>
      </View>
    ),
    [following, insets.top, posts.length, topCuisines, visitedRestaurants.length, tab, user, userId],
  );

  if (!user) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Pressable onPress={handleBack} style={{ padding: spacing.lg }} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>User not found</Text>
        </View>
      </View>
    );
  }

  const listData = tab === 'snaps' ? posts : visitedRestaurants;

  return (
    <View style={styles.root}>
      <FlatList
        key={tab}
        data={listData as any[]}
        numColumns={tab === 'snaps' ? 2 : 1}
        keyExtractor={(item: any) => item.id}
        ListHeaderComponent={Header}
        renderItem={tab === 'snaps' ? renderSnap : renderVisited}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name={tab === 'snaps' ? 'camera-outline' : 'restaurant-outline'}
              size={40}
              color={colors.textMuted}
            />
            <Text style={styles.emptyText}>
              {tab === 'snaps' ? 'No snaps yet' : 'No places visited yet'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },

  topNav: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Identity block
  identity: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: 10,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: 'rgba(201,162,74,0.5)',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.bgElevated,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  displayName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },

  // Cuisine chips
  cuisineRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  cuisineChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(201,162,74,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(201,162,74,0.25)',
  },
  cuisineChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.goldLight,
    letterSpacing: 0.3,
  },

  // Stats — dining only, no social counts
  statsRow: { marginTop: 2 },
  statsText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  statsNum: {
    fontWeight: '700',
    color: colors.textSecondary,
  },
  statsDivider: {
    color: colors.textMuted,
    fontWeight: '400',
  },

  // Follow button
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 9,
    paddingHorizontal: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gold,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  followBtnActive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(201,162,74,0.4)',
    shadowOpacity: 0,
  },
  followBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.bgBase,
  },
  followBtnTextActive: {
    color: colors.goldLight,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.xl,
    marginBottom: 2,
  },
  tab: { paddingVertical: 11 },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.textPrimary, fontWeight: '700' },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.gold,
  },

  // Snaps grid — 2 column
  snapThumb: {
    width: THUMB,
    height: THUMB,
    overflow: 'hidden',
  },
  snapImg: { width: '100%', height: '100%', backgroundColor: colors.bgElevated },
  snapGradient: { ...StyleSheet.absoluteFillObject },

  // Visited list
  visitCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    height: 100,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'flex-end',
  },
  visitPhoto: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  visitInfo: { padding: spacing.md },
  visitName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.2,
  },
  visitCuisine: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },

  // Empty
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: spacing.sm,
  },
  emptyText: { fontSize: 15, color: colors.textMuted, fontWeight: '500' },

  // Not found
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 15, color: colors.textMuted },
});
