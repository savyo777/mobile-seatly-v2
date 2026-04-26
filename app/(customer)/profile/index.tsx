import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mockCustomer } from '@/lib/mock/users';
import { getSavedRestaurants } from '@/lib/mock/profileScreens';
import { mockReservations } from '@/lib/mock/reservations';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { listSnapPostsByUser } from '@/lib/mock/snaps';
import { useColors, useTheme, createStyles, spacing, borderRadius } from '@/lib/theme';

const MOCK_DINNERS = 12;
const MOCK_CITIES = 3;
const MOCK_POINTS = mockCustomer.loyaltyPointsBalance ?? 0;
const MOCK_LOCATION = 'Toronto · King West';
const MOCK_MEMBER_SINCE = 'May 2024';
const MOCK_CUISINES = ['Italian', 'Japanese', 'French'];
const MOCK_DIETARY = ['No shellfish', 'Pescatarian-flex'];
const MOCK_VIBES = ['Date night', 'Counter seats'];

const DINER_TIERS = [
  { name: 'Regular', min: 0 },
  { name: 'Insider', min: 16 },
  { name: 'Elite', min: 32 },
];

function getDinerTier(dinners: number) {
  for (let i = DINER_TIERS.length - 1; i >= 0; i--) {
    if (dinners >= DINER_TIERS[i].min) return DINER_TIERS[i];
  }
  return DINER_TIERS[0];
}

function getNextTier(dinners: number) {
  for (const tier of DINER_TIERS) {
    if (dinners < tier.min) return tier;
  }
  return null;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatVisitDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

function priceLabel(n: number) {
  return '$'.repeat(n);
}

const savedRestaurants = getSavedRestaurants();

const recentVisits = mockReservations
  .filter((r) => r.status === 'completed' && r.guestId === 'g1')
  .sort((a, b) => new Date(b.reservedAt).getTime() - new Date(a.reservedAt).getTime())
  .slice(0, 3);

const ACCOUNT_ROWS = [
  { icon: 'notifications-outline' as const, title: 'Notifications', value: 'On', route: '/(customer)/profile/notifications' },
  { icon: 'card-outline' as const, title: 'Payment methods', value: 'Visa · 4242', route: '/(customer)/profile/payment' },
  { icon: 'location-outline' as const, title: 'Addresses', value: '2 saved', route: '/(customer)/profile/settings' },
  { icon: 'lock-closed-outline' as const, title: 'Privacy', value: null, route: '/(customer)/profile/privacy' },
  { icon: 'help-circle-outline' as const, title: 'Help & support', value: null, route: '/(customer)/profile/help' },
];

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  headerKicker: {
    fontSize: 30,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: c.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 26,
    fontWeight: '800',
    color: c.bgBase,
    letterSpacing: -0.5,
  },
  avatarMeta: { flex: 1, paddingTop: 4 },
  userName: {
    fontSize: 26,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  userLocation: {
    fontSize: 13,
    color: c.textMuted,
    fontWeight: '500',
    marginTop: 3,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(201,162,74,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(201,162,74,0.35)',
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: c.gold,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },

  progressCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textPrimary,
  },
  progressLabelNext: { color: c.gold, fontWeight: '700' },
  progressPct: { fontSize: 13, fontWeight: '700', color: c.textMuted },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: c.bgElevated,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%' as any,
    backgroundColor: c.gold,
    borderRadius: 3,
  },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.6,
    marginTop: 3,
    textTransform: 'uppercase' as const,
  },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.9,
    textTransform: 'uppercase' as const,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '700',
    color: c.gold,
  },

  savedScroll: {
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    gap: spacing.sm,
  },
  savedCard: {
    width: 180,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  savedPhoto: {
    width: '100%' as any,
    height: 110,
    backgroundColor: c.bgElevated,
  },
  savedBookmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedCardBody: { padding: spacing.sm },
  savedName: {
    fontSize: 14,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.2,
  },
  savedMeta: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },

  prefsCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  prefsSubTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.7,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
  },
  prefsChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prefsChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  prefsChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textPrimary,
  },
  prefsAddChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: c.textMuted,
    borderStyle: 'dashed' as const,
  },
  prefsAddText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textMuted,
  },
  prefsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
  },

  visitsCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  visitRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  visitThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: c.bgElevated,
    overflow: 'hidden',
  },
  visitThumbImg: { width: '100%' as any, height: '100%' as any },
  visitInfo: { flex: 1, minWidth: 0 },
  visitName: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.2,
  },
  visitMeta: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  rebookBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(201,162,74,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(201,162,74,0.4)',
  },
  rebookText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.gold,
  },

  accountCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    gap: spacing.md,
  },
  accountRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  accountRowPressed: { backgroundColor: c.bgElevated },
  accountIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
  },
  accountValue: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textMuted,
  },

  myPhotosRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  myPhotoThumb: {
    flex: 1,
    height: 90,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: c.bgElevated,
  },
  myPhotoImg: { width: '100%' as any, height: '100%' as any },

  signOutBtn: {
    marginHorizontal: spacing.lg,
    paddingVertical: 15,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
  },
}));

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const { effective, setMode, mode } = useTheme();

  const currentTier = getDinerTier(MOCK_DINNERS);
  const nextTier = getNextTier(MOCK_DINNERS);
  const dinnersUntilNext = nextTier ? nextTier.min - MOCK_DINNERS : 0;
  const progressRatio = nextTier ? MOCK_DINNERS / nextTier.min : 1;
  const initials = initialsFromName(mockCustomer.fullName);

  function cycleTheme() {
    if (mode === 'dark') setMode('light');
    else if (mode === 'light') setMode('system');
    else setMode('dark');
  }

  const themeIcon = effective === 'dark' ? 'moon-outline' : 'sunny-outline';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerKicker}>PROFILE</Text>
        <View style={styles.headerRight}>
          <Pressable
            onPress={cycleTheme}
            style={({ pressed }) => [styles.themeBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name={themeIcon} size={18} color={c.textPrimary} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(customer)/profile/settings')}
            style={({ pressed }) => [styles.themeBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="settings-outline" size={18} color={c.textPrimary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <View style={styles.avatarMeta}>
            <Text style={styles.userName}>{mockCustomer.fullName}</Text>
            <Text style={styles.userLocation}>
              {MOCK_LOCATION} · since {MOCK_MEMBER_SINCE}
            </Text>
            <View style={styles.tierBadge}>
              <Ionicons name="star" size={11} color={c.gold} />
              <Text style={styles.tierBadgeText}>{currentTier.name}</Text>
            </View>
          </View>
        </View>

        {/* Progress toward next tier */}
        {nextTier && (
          <View style={styles.progressCard}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>
                {dinnersUntilNext} dinners until{' '}
                <Text style={styles.progressLabelNext}>{nextTier.name}</Text>
              </Text>
              <Text style={styles.progressPct}>{Math.round(progressRatio * 100)}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{MOCK_DINNERS}</Text>
            <Text style={styles.statLabel}>Dinners</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{MOCK_CITIES}</Text>
            <Text style={styles.statLabel}>Cities</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{MOCK_POINTS.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
        </View>

        {/* Saved Places */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Saved Places · {savedRestaurants.length}</Text>
          <Pressable hitSlop={8} onPress={() => router.push('/(customer)/profile/favorites')}>
            <Text style={styles.sectionLink}>See all</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.savedScroll}
          style={{ marginBottom: spacing.lg }}
        >
          {savedRestaurants.map((r) => (
            <Pressable
              key={r.id}
              style={({ pressed }) => [styles.savedCard, pressed && { opacity: 0.8 }]}
              onPress={() => router.push(`/(customer)/discover/${r.id}` as Href)}
            >
              <Image source={{ uri: r.coverPhotoUrl }} style={styles.savedPhoto} resizeMode="cover" />
              <View style={styles.savedBookmark}>
                <Ionicons name="bookmark" size={13} color={c.gold} />
              </View>
              <View style={styles.savedCardBody}>
                <Text style={styles.savedName} numberOfLines={1}>{r.name}</Text>
                <Text style={styles.savedMeta}>
                  {r.cuisineType} · {priceLabel(r.priceRange)}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* Dining Preferences */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Dining Preferences</Text>
        </View>
        <View style={styles.prefsCard}>
          <View>
            <Text style={styles.prefsSubTitle}>Cuisines</Text>
            <View style={styles.prefsChipRow}>
              {MOCK_CUISINES.map((name) => (
                <View key={name} style={styles.prefsChip}>
                  <Text style={styles.prefsChipText}>{name}</Text>
                </View>
              ))}
              <Pressable style={styles.prefsAddChip}>
                <Text style={styles.prefsAddText}>+ Add</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.prefsDivider} />
          <View>
            <Text style={styles.prefsSubTitle}>Dietary</Text>
            <View style={styles.prefsChipRow}>
              {MOCK_DIETARY.map((name) => (
                <View key={name} style={styles.prefsChip}>
                  <Text style={styles.prefsChipText}>{name}</Text>
                </View>
              ))}
              <Pressable style={styles.prefsAddChip}>
                <Text style={styles.prefsAddText}>+ Add</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.prefsDivider} />
          <View>
            <Text style={styles.prefsSubTitle}>Vibes</Text>
            <View style={styles.prefsChipRow}>
              {MOCK_VIBES.map((name) => (
                <View key={name} style={styles.prefsChip}>
                  <Text style={styles.prefsChipText}>{name}</Text>
                </View>
              ))}
              <Pressable style={styles.prefsAddChip}>
                <Text style={styles.prefsAddText}>+ Add</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Recent Visits */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent Visits</Text>
          <Pressable hitSlop={8} onPress={() => router.push('/(customer)/activity' as Href)}>
            <Text style={styles.sectionLink}>History</Text>
          </Pressable>
        </View>
        <View style={styles.visitsCard}>
          {recentVisits.map((visit, idx) => {
            const restaurant = mockRestaurants.find((r) => r.id === visit.restaurantId);
            return (
              <View
                key={visit.id}
                style={[styles.visitRow, idx < recentVisits.length - 1 && styles.visitRowBorder]}
              >
                <View style={styles.visitThumb}>
                  {restaurant?.logoUrl ? (
                    <Image
                      source={{ uri: restaurant.logoUrl }}
                      style={styles.visitThumbImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="restaurant-outline" size={20} color={c.textMuted} />
                  )}
                </View>
                <View style={styles.visitInfo}>
                  <Text style={styles.visitName} numberOfLines={1}>
                    {visit.restaurantName}
                  </Text>
                  <Text style={styles.visitMeta}>
                    {formatVisitDate(visit.reservedAt)} · {visit.partySize}{' '}
                    {visit.partySize === 1 ? 'guest' : 'guests'}
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.rebookBtn, pressed && { opacity: 0.7 }]}
                  onPress={() =>
                    router.push(`/booking/${visit.restaurantId}/step2-time` as Href)
                  }
                >
                  <Text style={styles.rebookText}>Rebook</Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* My Photos */}
        {(() => {
          const mySnaps = listSnapPostsByUser(mockCustomer.id).slice(0, 3);
          if (mySnaps.length === 0) return null;
          return (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>My Photos</Text>
                <Pressable hitSlop={8} onPress={() => router.push('/(customer)/feed' as Href)}>
                  <Text style={styles.sectionLink}>See all</Text>
                </Pressable>
              </View>
              <View style={styles.myPhotosRow}>
                {mySnaps.map((snap) => (
                  <Pressable
                    key={snap.id}
                    style={({ pressed }) => [styles.myPhotoThumb, pressed && { opacity: 0.8 }]}
                    onPress={() => router.push(`/(customer)/discover/snaps/detail/${snap.id}` as Href)}
                  >
                    <Image source={{ uri: snap.image }} style={styles.myPhotoImg} resizeMode="cover" />
                  </Pressable>
                ))}
              </View>
            </>
          );
        })()}

        {/* Account */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Account</Text>
        </View>
        <View style={styles.accountCard}>
          {ACCOUNT_ROWS.map((row, idx) => (
            <Pressable
              key={row.title}
              style={({ pressed }) => [
                styles.accountRow,
                idx < ACCOUNT_ROWS.length - 1 && styles.accountRowBorder,
                pressed && styles.accountRowPressed,
              ]}
              onPress={() => router.push(row.route as Href)}
            >
              <View style={styles.accountIcon}>
                <Ionicons name={row.icon} size={17} color={c.textSecondary} />
              </View>
              <Text style={styles.accountTitle}>{row.title}</Text>
              {row.value ? <Text style={styles.accountValue}>{row.value}</Text> : null}
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* Sign out */}
        <Pressable
          style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.7 }]}
          onPress={() => router.replace('/(auth)/login' as Href)}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
