import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { mockCustomer } from '@/lib/mock/users';
import { mockReservations } from '@/lib/mock/reservations';
import { listSnapPostsByUser } from '@/lib/mock/snaps';
import { getFollowerCount } from '@/lib/mock/social';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { mockLoyaltyTransactions, mockRewards } from '@/lib/mock/loyalty';
import { colors, spacing, borderRadius } from '@/lib/theme';

const ME = mockCustomer.id;
const SCREEN_W = Dimensions.get('window').width;
const GRID_GAP = 2;
const GRID_COLS = 3;
const TILE_SIZE = (SCREEN_W - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;
const TAB_W = SCREEN_W / 3;

const TIERS = [
  { name: 'Bronze',   min: 0,    next: 500,  color: '#CD7F32' },
  { name: 'Silver',   min: 500,  next: 1500, color: '#A8A8B8' },
  { name: 'Gold',     min: 1500, next: 3000, color: colors.gold },
  { name: 'Platinum', min: 3000, next: 3000, color: '#E2E2F0' },
] as const;

function getTierInfo(pts: number) {
  const idx = TIERS.findIndex((_, i) => pts < (TIERS[i + 1]?.min ?? Infinity));
  const tier = TIERS[Math.max(0, idx)];
  const next = TIERS[idx + 1] ?? null;
  const progress = next ? (pts - tier.min) / (next.min - tier.min) : 1;
  return { tier, next, progress, toNext: next ? next.min - pts : 0 };
}

function getVisits() {
  return mockReservations
    .filter((r) => r.guestId === 'g1' && r.status === 'completed')
    .map((r) => ({ reservation: r, restaurant: mockRestaurants.find((x) => x.id === r.restaurantId) }))
    .filter((v): v is typeof v & { restaurant: NonNullable<typeof v['restaurant']> } => v.restaurant != null);
}

type Tab = 'snaps' | 'dining' | 'rewards';
const TAB_ORDER: Tab[] = ['snaps', 'dining', 'rewards'];
const MAX_STAGGER = 12;

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('snaps');

  const posts = listSnapPostsByUser(ME);
  const followerCount = getFollowerCount(ME);
  const visits = getVisits();
  const pts = mockCustomer.loyaltyPointsBalance ?? 0;
  const { tier, next: nextTier, progress, toNext } = getTierInfo(pts);

  // Tab indicator spring
  const tabAnim = useRef(new Animated.Value(0)).current;

  const switchTab = useCallback((t: Tab) => {
    setTab(t);
    Animated.spring(tabAnim, {
      toValue: TAB_ORDER.indexOf(t) * TAB_W,
      useNativeDriver: true,
      tension: 160,
      friction: 12,
    }).start();
  }, [tabAnim]);

  // Staggered card entrance
  const staggerAnims = useRef(
    Array.from({ length: MAX_STAGGER }, () => new Animated.Value(0))
  ).current;

  const runStagger = useCallback((count: number) => {
    const n = Math.min(count, MAX_STAGGER);
    staggerAnims.slice(0, n).forEach((a) => a.setValue(0));
    Animated.stagger(
      55,
      staggerAnims.slice(0, n).map((a) =>
        Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 120, friction: 11 }),
      ),
    ).start();
  }, [staggerAnims]);

  useEffect(() => {
    if (tab === 'snaps') runStagger(1);
    else if (tab === 'dining') runStagger(visits.length || 1);
    else runStagger(mockRewards.length + 2);
  }, [tab, runStagger, visits.length]);

  const cardStyle = (i: number) => ({
    opacity: staggerAnims[i],
    transform: [{ translateY: staggerAnims[i].interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>

        {/* ── HEADER ── */}
        <LinearGradient
          colors={['rgba(201,162,74,0.09)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.headerGradient}
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            <Text style={styles.handle}>@alexj</Text>
            <Pressable
              onPress={() => router.push('/(customer)/profile/settings' as Href)}
              hitSlop={10}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="settings-outline" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarGlow}>
              <View style={styles.avatarRing}>
                {mockCustomer.avatarUrl ? (
                  <Image source={{ uri: mockCustomer.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Ionicons name="person" size={38} color={colors.textMuted} />
                  </View>
                )}
              </View>
            </View>

            <Text style={styles.name}>{mockCustomer.fullName}</Text>
            <Text style={styles.bio}>Food explorer · Toronto</Text>

            {/* Tier badge */}
            <Pressable
              onPress={() => switchTab('rewards')}
              style={({ pressed }) => [styles.tierBadge, { borderColor: `${tier.color}55` }, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="star" size={11} color={tier.color} />
              <Text style={[styles.tierBadgeText, { color: tier.color }]}>{tier.name}</Text>
              {nextTier && (
                <Text style={styles.tierBadgeNext}> · {toNext.toLocaleString()} to {nextTier.name}</Text>
              )}
            </Pressable>
          </View>
        </LinearGradient>

        {/* ── STATS ROW ── */}
        <View style={styles.statsRow}>
          <Pressable style={styles.stat} onPress={() => switchTab('snaps')}>
            <Text style={styles.statValue}>{posts.length}</Text>
            <Text style={styles.statLabel}>Snaps</Text>
          </Pressable>
          <View style={styles.statDivider} />
          <Pressable style={styles.stat} onPress={() => router.push('/(customer)/profile/followers' as Href)}>
            <Text style={styles.statValue}>{followerCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </Pressable>
          <View style={styles.statDivider} />
          <Pressable style={styles.stat} onPress={() => switchTab('dining')}>
            <Text style={styles.statValue}>{visits.length}</Text>
            <Text style={styles.statLabel}>Visits</Text>
          </Pressable>
        </View>

        {/* ── ACTION ROW ── */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => router.push('/(customer)/profile/personal-info' as Href)}
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.actionBtnText}>Edit Profile</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}>
            <Ionicons name="share-outline" size={15} color={colors.textPrimary} />
            <Text style={styles.actionBtnText}>Share</Text>
          </Pressable>
        </View>

        {/* ── TAB STRIP ── */}
        <View style={styles.tabStrip}>
          {/* Spring indicator */}
          <Animated.View style={[styles.tabIndicator, { transform: [{ translateX: tabAnim }] }]} />

          {(['snaps', 'dining', 'rewards'] as Tab[]).map((t, i) => {
            const active = tab === t;
            const icons: Record<Tab, keyof typeof Ionicons.glyphMap> = {
              snaps: 'grid-outline',
              dining: 'restaurant-outline',
              rewards: 'star-outline',
            };
            return (
              <Pressable key={t} style={styles.tabBtn} onPress={() => switchTab(t)}>
                <Ionicons name={icons[t]} size={17} color={active ? colors.gold : colors.textMuted} />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── SNAPS TAB ── */}
        {tab === 'snaps' && (
          posts.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="camera-outline" size={44} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No snaps yet</Text>
              <Text style={styles.emptyText}>Book a table, dine, and share your experience.</Text>
            </View>
          ) : (
            <Animated.View style={[styles.grid, cardStyle(0)]}>
              {posts.map((post) => (
                <Pressable
                  key={post.id}
                  onPress={() => router.push(`/(customer)/discover/snaps/detail/${post.id}` as Href)}
                  style={({ pressed }) => [styles.gridTile, pressed && { opacity: 0.8 }]}
                >
                  <Image source={{ uri: post.image }} style={styles.gridImage} resizeMode="cover" />
                  {post.likes > 50 && (
                    <View style={styles.gridBadge}>
                      <Ionicons name="heart" size={9} color={colors.gold} />
                      <Text style={styles.gridBadgeText}>{post.likes}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </Animated.View>
          )
        )}

        {/* ── DINING TAB ── */}
        {tab === 'dining' && (
          <View style={styles.listWrap}>
            {visits.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="restaurant-outline" size={44} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No visits yet</Text>
                <Text style={styles.emptyText}>Complete a reservation to see your dining history.</Text>
              </View>
            ) : visits.map(({ reservation, restaurant }, i) => (
              <Animated.View key={reservation.id} style={cardStyle(i)}>
                <View style={styles.diningCard}>
                  <Pressable
                    style={styles.diningCardTop}
                    onPress={() => router.push(`/(customer)/discover/${restaurant.id}` as Href)}
                  >
                    <Image source={{ uri: restaurant.coverPhotoUrl }} style={styles.diningThumb} resizeMode="cover" />
                    <View style={styles.diningInfo}>
                      <Text style={styles.diningName}>{restaurant.name}</Text>
                      <Text style={styles.diningCuisine}>{restaurant.cuisineType}</Text>
                      <Text style={styles.diningAddress} numberOfLines={1}>{restaurant.address}</Text>
                      <View style={styles.visitedPill}>
                        <Ionicons name="checkmark-circle" size={11} color={colors.gold} />
                        <Text style={styles.visitedPillText}>Visited</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
                  </Pressable>
                  <View style={styles.diningActions}>
                    <Pressable
                      style={({ pressed }) => [styles.rebookBtn, pressed && { opacity: 0.8 }]}
                      onPress={() => router.push(`/booking/${restaurant.id}/step2-time` as Href)}
                    >
                      <LinearGradient
                        colors={['#D4AF6A', colors.gold, '#A87E30']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.rebookGradient}
                      >
                        <Ionicons name="calendar-outline" size={13} color="#1A1510" />
                        <Text style={styles.rebookText}>Rebook</Text>
                      </LinearGradient>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.viewBtn, pressed && { opacity: 0.7 }]}
                      onPress={() => router.push(`/(customer)/discover/${restaurant.id}` as Href)}
                    >
                      <Text style={styles.viewBtnText}>View restaurant</Text>
                    </Pressable>
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>
        )}

        {/* ── REWARDS TAB ── */}
        {tab === 'rewards' && (
          <View style={styles.listWrap}>

            {/* Tier card — glassmorphism */}
            <Animated.View style={cardStyle(0)}>
              {Platform.OS === 'ios' ? (
                <BlurView intensity={22} tint="dark" style={styles.tierCard}>
                  <TierCardContent tier={tier} nextTier={nextTier} progress={progress} toNext={toNext} pts={pts} />
                </BlurView>
              ) : (
                <View style={[styles.tierCard, styles.tierCardAndroid]}>
                  <TierCardContent tier={tier} nextTier={nextTier} progress={progress} toNext={toNext} pts={pts} />
                </View>
              )}
            </Animated.View>

            {/* Available rewards */}
            <Animated.View style={cardStyle(1)}>
              <Text style={styles.sectionLabel}>Available rewards</Text>
            </Animated.View>

            {mockRewards.map((reward, i) => {
              const canRedeem = pts >= reward.pointsCost;
              return (
                <Animated.View key={reward.id} style={cardStyle(i + 2)}>
                  <Pressable style={({ pressed }) => [styles.rewardRow, pressed && { opacity: 0.78 }]}>
                    <View style={[styles.rewardIcon, !canRedeem && { opacity: 0.38 }]}>
                      <Ionicons
                        name={reward.category === 'event' ? 'ticket-outline' : reward.category === 'discount' ? 'pricetag-outline' : 'gift-outline'}
                        size={17}
                        color={colors.gold}
                      />
                    </View>
                    <View style={styles.rewardBody}>
                      <Text style={[styles.rewardName, !canRedeem && { color: colors.textMuted }]}>{reward.name}</Text>
                      <Text style={styles.rewardDesc} numberOfLines={1}>{reward.description}</Text>
                    </View>
                    <View style={[styles.rewardCostPill, canRedeem && styles.rewardCostPillActive]}>
                      <Text style={[styles.rewardCostText, canRedeem && { color: colors.gold }]}>
                        {reward.pointsCost.toLocaleString()} pts
                      </Text>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}

            {/* History */}
            <Animated.View style={[cardStyle(mockRewards.length + 2), styles.historySection]}>
              <Text style={[styles.sectionLabel, { marginBottom: spacing.sm }]}>History</Text>
              {mockLoyaltyTransactions.map((tx, i) => (
                <View key={tx.id} style={[styles.txRow, i === mockLoyaltyTransactions.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[styles.txDot, { backgroundColor: tx.type === 'earn' ? colors.success : tx.type === 'redeem' ? colors.gold : colors.textMuted }]} />
                  <View style={styles.txBody}>
                    <Text style={styles.txDesc}>{tx.description}</Text>
                    <Text style={styles.txDate}>
                      {new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={[styles.txPts, { color: tx.type === 'earn' ? colors.success : colors.textMuted }]}>
                    {tx.type === 'earn' ? '+' : ''}{tx.points}
                  </Text>
                </View>
              ))}
            </Animated.View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

function TierCardContent({ tier, nextTier, progress, toNext, pts }: {
  tier: typeof TIERS[number];
  nextTier: typeof TIERS[number] | null;
  progress: number;
  toNext: number;
  pts: number;
}) {
  return (
    <LinearGradient
      colors={['rgba(201,162,74,0.07)', 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.tierCardInner}
    >
      <View style={styles.tierCardHeader}>
        <View>
          <Text style={styles.tierName}>{tier.name} Member</Text>
          <Text style={styles.tierPts}>{pts.toLocaleString()} points</Text>
        </View>
        <View style={[styles.tierIconCircle, { backgroundColor: `${tier.color}1A` }]}>
          <Ionicons name="star" size={22} color={tier.color} />
        </View>
      </View>
      {nextTier && (
        <>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: tier.color }]} />
          </View>
          <Text style={styles.progressLabel}>
            {toNext.toLocaleString()} pts to{' '}
            <Text style={{ color: tier.color, fontWeight: '700' }}>{nextTier.name}</Text>
          </Text>
        </>
      )}
      {!nextTier && (
        <Text style={styles.progressLabel}>You've reached the highest tier ✦</Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },

  // Header
  headerGradient: { paddingBottom: spacing.lg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  handle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },

  avatarSection: { alignItems: 'center', paddingTop: spacing.sm, gap: 6 },
  avatarGlow: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
    borderRadius: 64,
    marginBottom: 4,
  },
  avatarRing: {
    borderWidth: 2.5,
    borderColor: colors.gold,
    borderRadius: 64,
    padding: 3,
  },
  avatar: { width: 112, height: 112, borderRadius: 56, backgroundColor: colors.bgElevated },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },

  name: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, letterSpacing: 0.2 },
  bio: { fontSize: 13, color: colors.textSecondary, marginTop: -2 },

  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tierBadgeText: { fontSize: 12, fontWeight: '700' },
  tierBadgeNext: { fontSize: 11, color: colors.textMuted },

  // Stats — floating, no card
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  stat: { alignItems: 'center', gap: 3, flex: 1 },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.gold },
  statLabel: { fontSize: 10, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },

  // Tab strip
  tabStrip: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    position: 'relative',
    marginBottom: GRID_GAP,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: TAB_W,
    height: 2.5,
    backgroundColor: colors.gold,
    borderRadius: 2,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    gap: 5,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.gold },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  gridTile: { width: TILE_SIZE, height: TILE_SIZE, backgroundColor: colors.bgElevated },
  gridImage: { width: TILE_SIZE, height: TILE_SIZE },
  gridBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  gridBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  // List wrapper
  listWrap: { padding: spacing.md, gap: spacing.sm },

  // Dining cards
  diningCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  diningCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  diningThumb: {
    width: 68,
    height: 68,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bgElevated,
  },
  diningInfo: { flex: 1, gap: 2 },
  diningName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  diningCuisine: { fontSize: 12, color: colors.textMuted },
  diningAddress: { fontSize: 12, color: colors.textMuted },
  visitedPill: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  visitedPillText: { fontSize: 11, fontWeight: '700', color: colors.gold },
  diningActions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rebookBtn: { flex: 1 },
  rebookGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
  },
  rebookText: { fontSize: 13, fontWeight: '800', color: '#1A1510' },
  viewBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
  },
  viewBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },

  // Tier card
  tierCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(201,162,74,0.25)',
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  tierCardAndroid: { backgroundColor: 'rgba(30,25,15,0.95)' },
  tierCardInner: { padding: spacing.lg, gap: spacing.md },
  tierCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tierName: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  tierPts: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  tierIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  progressLabel: { fontSize: 12, color: colors.textMuted },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },

  // Reward rows
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  rewardIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(201,162,74,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardBody: { flex: 1, gap: 2 },
  rewardName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  rewardDesc: { fontSize: 12, color: colors.textMuted },
  rewardCostPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rewardCostPillActive: {
    backgroundColor: 'rgba(201,162,74,0.1)',
    borderColor: 'rgba(201,162,74,0.3)',
  },
  rewardCostText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },

  // History
  historySection: {
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  txDot: { width: 7, height: 7, borderRadius: 4 },
  txBody: { flex: 1 },
  txDesc: { fontSize: 13, fontWeight: '500', color: colors.textPrimary },
  txDate: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  txPts: { fontSize: 13, fontWeight: '700' },

  // Empty
  empty: {
    paddingTop: 56,
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
});
