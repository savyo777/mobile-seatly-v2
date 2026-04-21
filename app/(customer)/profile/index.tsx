import React, { useRef, useEffect } from 'react';
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
import { listSnapPostsByUser } from '@/lib/mock/snaps';
import { mockCustomer } from '@/lib/mock/users';
import { mockReservations } from '@/lib/mock/reservations';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { mockLoyaltyTransactions } from '@/lib/mock/loyalty';
import { colors, spacing, borderRadius } from '@/lib/theme';

const ME = mockCustomer.id;
const SCREEN_W = Dimensions.get('window').width;
const CARD_W = (SCREEN_W - spacing.lg * 2 - spacing.sm) / 2;

// ─── Tier config ─────────────────────────────────────────────────────────────
const TIERS = [
  { name: 'Bronze',   min: 0,    next: 500,  color: '#CD7F32' },
  { name: 'Silver',   min: 500,  next: 1500, color: '#A8A8B8' },
  { name: 'Gold',     min: 1500, next: 3000, color: colors.gold },
  { name: 'Platinum', min: 3000, next: 3000, color: '#E2E2F0' },
] as const;

function getTierInfo(pts: number) {
  const idx = TIERS.findIndex((_, i) => pts < (TIERS[i + 1]?.min ?? Infinity));
  const tier = TIERS[Math.max(0, idx)];
  const nextTier = TIERS[idx + 1] ?? null;
  const progress = nextTier ? (pts - tier.min) / (nextTier.min - tier.min) : 1;
  return { tier, nextTier, progress, toNext: nextTier ? nextTier.min - pts : 0 };
}

// ─── Data helpers ─────────────────────────────────────────────────────────────
function getNextBooking() {
  const now = new Date();
  return mockReservations
    .filter((r) => r.guestId === 'g1' && ['confirmed', 'pending'].includes(r.status) && new Date(r.reservedAt) > now)
    .sort((a, b) => new Date(a.reservedAt).getTime() - new Date(b.reservedAt).getTime())[0] ?? null;
}

function getLastVisit() {
  return mockReservations
    .filter((r) => r.guestId === 'g1' && r.status === 'completed')
    .sort((a, b) => new Date(b.reservedAt).getTime() - new Date(a.reservedAt).getTime())[0] ?? null;
}

function formatBookingDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((d.getTime() - now.getTime()) / 86400000);
  if (diff === 0) return 'Tonight';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatPastDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const posts = listSnapPostsByUser(ME);
  const pts = mockCustomer.loyaltyPointsBalance ?? 0;
  const { tier, nextTier, progress, toNext } = getTierInfo(pts);
  const totalVisits = mockReservations.filter((r) => r.guestId === 'g1' && r.status === 'completed').length;
  const nextBooking = getNextBooking();
  const lastVisit = getLastVisit();
  const nextRestaurant = nextBooking ? mockRestaurants.find((r) => r.id === nextBooking.restaurantId) : null;
  const lastRestaurant = lastVisit ? mockRestaurants.find((r) => r.id === lastVisit.restaurantId) : null;

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 100, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const nav = (href: string) => router.push(href as Href);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* ── HEADER ─────────────────────────────────────────────── */}
        <LinearGradient
          colors={['rgba(201,162,74,0.08)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.header}
        >
          {/* Gear floats top-right above avatar */}
          <Pressable
            hitSlop={8}
            style={styles.settingsBtn}
            onPress={() => nav('/(customer)/profile/settings')}
          >
            {({ pressed }) => (
              <Ionicons
                name="settings-outline"
                size={22}
                color={pressed ? colors.gold : 'rgba(201,162,74,0.65)'}
              />
            )}
          </Pressable>

          {/* Push avatar below the floating gear */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarGlow}>
              <View style={styles.avatarRing}>
                {mockCustomer.avatarUrl ? (
                  <Image source={{ uri: mockCustomer.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Ionicons name="person" size={36} color={colors.textMuted} />
                  </View>
                )}
              </View>
            </View>
            <Text style={styles.name}>{mockCustomer.fullName}</Text>
            <Text style={styles.handle}>@alexj</Text>

            {/* Tier badge */}
            <Pressable
              onPress={() => nav('/(customer)/profile/loyalty')}
              style={({ pressed }) => [styles.tierBadge, { borderColor: `${tier.color}50` }, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="star" size={11} color={tier.color} />
              <Text style={[styles.tierBadgeText, { color: tier.color }]}>{tier.name} Member</Text>
              <Text style={styles.tierBadgePts}>· {pts.toLocaleString()} pts</Text>
            </Pressable>
          </View>

          {/* Quick stats */}
          <View style={styles.quickStats}>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{totalVisits}</Text>
              <Text style={styles.quickStatLabel}>Visits</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{pts.toLocaleString()}</Text>
              <Text style={styles.quickStatLabel}>Points</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{tier.name}</Text>
              <Text style={styles.quickStatLabel}>Tier</Text>
            </View>
          </View>
        </LinearGradient>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── DINING SNAPSHOT ──────────────────────────────────── */}
          {(nextBooking || lastVisit) ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Dining</Text>
              <View style={styles.snapshotRow}>
                {/* Next booking card */}
                {nextBooking && nextRestaurant ? (
                  <Pressable
                    style={({ pressed }) => [styles.snapshotCard, pressed && { opacity: 0.88 }]}
                    onPress={() => nav('/(customer)/activity')}
                  >
                    <Image source={{ uri: nextRestaurant.coverPhotoUrl }} style={styles.snapshotPhoto} resizeMode="cover" />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.78)']}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.snapshotOverlay}>
                      <View style={styles.snapshotPill}>
                        <Text style={styles.snapshotPillText}>{formatBookingDate(nextBooking.reservedAt)}</Text>
                      </View>
                      <Text style={styles.snapshotName} numberOfLines={1}>{nextRestaurant.name}</Text>
                      <Text style={styles.snapshotMeta}>
                        {formatTime(nextBooking.reservedAt)} · {nextBooking.partySize} guests
                      </Text>
                    </View>
                  </Pressable>
                ) : null}

                {/* Last visit card */}
                {lastVisit && lastRestaurant ? (
                  <Pressable
                    style={({ pressed }) => [styles.snapshotCard, pressed && { opacity: 0.88 }]}
                    onPress={() => nav(`/(customer)/discover/${lastRestaurant.id}`)}
                  >
                    <Image source={{ uri: lastRestaurant.coverPhotoUrl }} style={styles.snapshotPhoto} resizeMode="cover" />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.78)']}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.snapshotOverlay}>
                      <View style={[styles.snapshotPill, styles.snapshotPillMuted]}>
                        <Text style={[styles.snapshotPillText, { color: colors.textSecondary }]}>
                          {formatPastDate(lastVisit.reservedAt)}
                        </Text>
                      </View>
                      <Text style={styles.snapshotName} numberOfLines={1}>{lastRestaurant.name}</Text>
                      <Pressable
                        style={styles.rebookPill}
                        onPress={() => nav(`/booking/${lastRestaurant.id}/step2-time`)}
                      >
                        <Text style={styles.rebookPillText}>Rebook →</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* ── LOYALTY CARD ─────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Rewards</Text>
            <Pressable
              onPress={() => nav('/(customer)/profile/loyalty')}
              style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
            >
              {Platform.OS === 'ios' ? (
                <BlurView intensity={22} tint="dark" style={styles.loyaltyCard}>
                  <LoyaltyCardContent tier={tier} nextTier={nextTier} progress={progress} toNext={toNext} pts={pts} />
                </BlurView>
              ) : (
                <View style={[styles.loyaltyCard, { backgroundColor: 'rgba(28,22,12,0.98)' }]}>
                  <LoyaltyCardContent tier={tier} nextTier={nextTier} progress={progress} toNext={toNext} pts={pts} />
                </View>
              )}
            </Pressable>
          </View>

          {/* ── RECENT SNAPS ─────────────────────────────────────── */}
          {posts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.snapsHeader}>
                <Text style={styles.sectionLabel}>My snaps</Text>
                <Pressable
                  onPress={() => nav('/(customer)/profile/my-snaps')}
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Text style={styles.seeAllLink}>See all →</Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.snapsRow}
              >
                {posts.slice(0, 8).map((post) => (
                  <Pressable
                    key={post.id}
                    onPress={() => nav(`/(customer)/profile/snaps/detail/${post.id}`)}
                    style={({ pressed }) => [styles.snapThumb, pressed && { opacity: 0.8 }]}
                  >
                    <Image source={{ uri: post.image }} style={styles.snapThumbImg} resizeMode="cover" />
                    {post.likes > 50 && (
                      <View style={styles.snapLikeBadge}>
                        <Ionicons name="heart" size={9} color={colors.gold} />
                        <Text style={styles.snapLikeText}>{post.likes}</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Loyalty card inner ───────────────────────────────────────────────────────
function LoyaltyCardContent({ tier, nextTier, progress, toNext, pts }: {
  tier: typeof TIERS[number];
  nextTier: typeof TIERS[number] | null;
  progress: number;
  toNext: number;
  pts: number;
}) {
  const recentEarned = mockLoyaltyTransactions.filter((t) => t.type === 'earn').slice(0, 1)[0];
  return (
    <LinearGradient
      colors={['rgba(201,162,74,0.09)', 'rgba(201,162,74,0.02)', 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.loyaltyInner}
    >
      <View style={styles.loyaltyTop}>
        <View style={{ gap: 3 }}>
          <Text style={styles.loyaltyTierName}>{tier.name} Member</Text>
          <Text style={styles.loyaltyPoints}>{pts.toLocaleString()} points</Text>
        </View>
        <View style={[styles.loyaltyIcon, { backgroundColor: `${tier.color}20` }]}>
          <Ionicons name="star" size={22} color={tier.color} />
        </View>
      </View>

      {nextTier ? (
        <>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: tier.color }]} />
          </View>
          <Text style={styles.loyaltySub}>
            {toNext.toLocaleString()} pts to{' '}
            <Text style={{ color: tier.color, fontWeight: '700' }}>{nextTier.name}</Text>
          </Text>
        </>
      ) : (
        <Text style={styles.loyaltySub}>Highest tier achieved ✦</Text>
      )}

      <View style={styles.loyaltyFooter}>
        {recentEarned ? (
          <Text style={styles.loyaltyRecent}>
            Last earned: <Text style={{ color: colors.success }}>+{recentEarned.points} pts</Text> · {recentEarned.description}
          </Text>
        ) : null}
        <Text style={styles.loyaltyLink}>View rewards →</Text>
      </View>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },

  // Header
  header: { paddingBottom: spacing.xl, paddingTop: spacing.sm, position: 'relative' },
  settingsBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.lg,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(201,162,74,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(201,162,74,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarSection: { alignItems: 'center', gap: 5, paddingTop: 52, paddingBottom: spacing.lg },
  avatarGlow: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 10,
    borderRadius: 60,
    marginBottom: 6,
  },
  avatarRing: {
    borderWidth: 2.5,
    borderColor: colors.gold,
    borderRadius: 60,
    padding: 3,
  },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.bgElevated },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 21, fontWeight: '800', color: colors.textPrimary, letterSpacing: 0.2 },
  handle: { fontSize: 13, color: colors.textMuted, marginTop: -2 },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tierBadgeText: { fontSize: 12, fontWeight: '700' },
  tierBadgePts: { fontSize: 11, color: colors.textMuted },

  // Quick stats
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickStat: { flex: 1, alignItems: 'center', gap: 3 },
  quickStatValue: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  quickStatLabel: { fontSize: 10, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.7 },
  quickStatDivider: { width: 1, height: 26, backgroundColor: colors.border },

  // Section wrapper
  section: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },

  // Dining snapshot cards
  snapshotRow: { flexDirection: 'row', gap: spacing.sm },
  snapshotCard: {
    width: CARD_W,
    height: 160,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.bgElevated,
  },
  snapshotPhoto: { ...StyleSheet.absoluteFillObject },
  snapshotOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    gap: 4,
  },
  snapshotPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gold,
    marginBottom: 2,
  },
  snapshotPillMuted: { backgroundColor: 'rgba(255,255,255,0.18)' },
  snapshotPillText: { fontSize: 10, fontWeight: '800', color: colors.bgBase },
  snapshotName: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  snapshotMeta: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  rebookPill: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  rebookPillText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

  // Snaps row
  snapsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  seeAllLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gold,
  },
  snapsRow: { gap: spacing.sm, paddingBottom: 2 },
  snapThumb: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.bgElevated,
  },
  snapThumbImg: { width: 80, height: 80 },
  snapLikeBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  snapLikeText: { fontSize: 9, fontWeight: '700', color: '#fff' },

  // Loyalty card
  loyaltyCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(201,162,74,0.22)',
    overflow: 'hidden',
  },
  loyaltyInner: { padding: spacing.lg, gap: spacing.sm },
  loyaltyTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  loyaltyTierName: { fontSize: 19, fontWeight: '800', color: colors.textPrimary },
  loyaltyPoints: { fontSize: 13, color: colors.textMuted },
  loyaltyIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  progressFill: {
    height: 5,
    borderRadius: 3,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
  },
  loyaltySub: { fontSize: 12, color: colors.textMuted },
  loyaltyFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  loyaltyRecent: { fontSize: 11, color: colors.textMuted, flex: 1, marginRight: spacing.sm },
  loyaltyLink: { fontSize: 13, fontWeight: '700', color: colors.gold },

});
