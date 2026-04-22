import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter, Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  listFeedPosts,
  getRestaurantForPost,
  type SnapPost,
} from '@/lib/mock/snaps';
import { listFollowingPosts, listTrendingPosts } from '@/lib/mock/social';
import { SnapGrid } from '@/components/snaps/SnapGrid';
import { FeedHero } from '@/components/feed/FeedHero';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { CollectionsStrip } from '@/components/feed/CollectionsStrip';
import { mockCustomer } from '@/lib/mock/users';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';

type FeedMode = 'local' | 'following' | 'explore';
type FeedItem = SnapPost | { _type: 'collections' };

const TORONTO_LAT = 43.6532;
const TORONTO_LNG = -79.3832;
const LOCAL_RADIUS_KM = 50;
const ME = mockCustomer.id;
const COLLECTIONS_EVERY = 5;

const MODE_TABS: { key: FeedMode; label: string; icon: string }[] = [
  { key: 'local', label: 'Nearby', icon: 'location-outline' },
  { key: 'following', label: 'Following', icon: 'people-outline' },
  { key: 'explore', label: 'Trending', icon: 'flame-outline' },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Tonight';
}

function injectCollections(posts: SnapPost[]): FeedItem[] {
  const result: FeedItem[] = [];
  posts.forEach((post, i) => {
    result.push(post);
    if ((i + 1) % COLLECTIONS_EVERY === 0 && i < posts.length - 1) {
      result.push({ _type: 'collections' });
    }
  });
  return result;
}

const useStyles = createStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bgBase },

  // Header
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  headerTop: {
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  greetingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.gold,
  },
  greetingText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 1.3,
  },
  // Tabs
  tabs: {
    flexDirection: 'row',
    paddingTop: 24,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 10,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textMuted,
  },
  tabLabelActive: {
    color: c.gold,
    fontWeight: '700',
  },
  tabUnderline: {
    height: 2,
    width: '55%',
    borderRadius: 2,
    backgroundColor: c.gold,
    marginTop: -1,
  },

  // Between posts
  separator: {
    height: 8,
    backgroundColor: c.bgBase,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },

  // Empty state
  emptyCard: {
    margin: spacing.lg,
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing['3xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textPrimary,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCta: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: c.gold,
  },
  emptyCtaText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.gold,
  },
}));

export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const [mode, setMode] = useState<FeedMode>('local');

  // Collapsing header animation
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 64],
    outputRange: [64, 0],
    extrapolate: 'clamp',
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 48],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const rawPosts: SnapPost[] = useMemo(() =>
    mode === 'following'
      ? listFollowingPosts(ME)
      : mode === 'local'
      ? listFeedPosts(TORONTO_LAT, TORONTO_LNG, LOCAL_RADIUS_KM)
      : listTrendingPosts(7),
    [mode],
  );

  const feedItems: FeedItem[] = useMemo(() => injectCollections(rawPosts), [rawPosts]);

  // Hero: highest-liked Top Rated post
  const heroPost = useMemo(() => {
    const topRated = rawPosts.find(p => getRestaurantForPost(p.restaurant_id)?.availability === 'Top Rated');
    return topRated ?? rawPosts[0];
  }, [rawPosts]);
  const heroRestaurant = heroPost ? getRestaurantForPost(heroPost.restaurant_id) : null;

  const handleTabSwitch = useCallback((m: FeedMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(m);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      if ('_type' in item) {
        return <CollectionsStrip />;
      }
      const post = item as SnapPost;
      return <FeedPostCard item={post} />;
    },
    [],
  );

  const ListHeader = useMemo(() => {
    if (!heroRestaurant || !heroPost) return null;
    return (
      <FeedHero
        restaurant={heroRestaurant}
        onPressCard={() => router.push(`/(customer)/discover/${heroPost.restaurant_id}` as Href)}
        onPressReserve={() => router.push(`/booking/${heroPost.restaurant_id}/step2-time` as Href)}
      />
    );
  }, [heroRestaurant, heroPost, router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        {/* Collapsing top slab */}
        <Animated.View style={[styles.headerTop, { height: headerHeight, opacity: headerOpacity, overflow: 'hidden' }]}>
          <View style={styles.greetingRow}>
            <View style={styles.greetingLeft}>
              <View style={styles.greetingDot} />
              <Text style={styles.greetingText}>
                {getGreeting().toUpperCase()} · TORONTO
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Sticky tab bar */}
        <View style={styles.tabs}>
          {MODE_TABS.map((tab) => {
            const active = mode === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => handleTabSwitch(tab.key)}
                style={styles.tab}
              >
                <View style={styles.tabInner}>
                  <Ionicons
                    name={tab.icon as any}
                    size={14}
                    color={active ? c.gold : c.textMuted}
                  />
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                    {tab.label}
                  </Text>
                </View>
                {active ? <View style={styles.tabUnderline} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Feed ── */}
      {mode === 'explore' ? (
        <SnapGrid
          posts={rawPosts}
          contentContainerStyle={{ paddingBottom: insets.bottom + 104 }}
          emptyLabel="No posts yet."
        />
      ) : (
        <FlatList
          data={feedItems}
          keyExtractor={(item, i) => ('_type' in item ? `collections-${i}` : item.id)}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingBottom: insets.bottom + 104 }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons
                name={mode === 'following' ? 'people-outline' : 'images-outline'}
                size={44}
                color={c.textMuted}
                style={{ marginBottom: spacing.md }}
              />
              <Text style={styles.emptyTitle}>
                {mode === 'following' ? 'No posts yet' : 'Nothing nearby yet'}
              </Text>
              <Text style={styles.emptyText}>
                {mode === 'following'
                  ? 'Follow food lovers to see their posts here.'
                  : 'Be the first to post a meal in your area.'}
              </Text>
              <Pressable
                onPress={() =>
                  router.push(
                    (mode === 'following'
                      ? '/(customer)/discover'
                      : '/(customer)/discover/post-review/camera') as Href,
                  )
                }
                style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.75 }]}
              >
                <Text style={styles.emptyCtaText}>
                  {mode === 'following' ? 'Find people →' : 'Share a meal →'}
                </Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}
