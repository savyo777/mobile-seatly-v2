import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getSavedRestaurants } from '@/lib/mock/profileScreens';
import { resolveAuthDisplayProfile, initialsFromDisplayName } from '@/lib/auth/displayProfile';
import { restaurantPriceLabel } from '@/lib/restaurants/pricing';
import { useColors, useTheme, createStyles, spacing, borderRadius } from '@/lib/theme';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { deleteAccount } from '@/lib/services/accountSecurity';
import { fetchMyBookingItems, type MyBookingItem } from '@/lib/booking/myReservations';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { isLoyaltyEnabled } from '@/lib/config/loyaltyFeature';
import { DINER_TIERS, getDinerTier, getNextDinerTier } from '@/lib/loyalty/dinerTiers';
import {
  fetchCurrentUserProfile,
  updateCurrentUserProfile,
  type AppUserProfile,
} from '@/lib/services/userProfile';
import { getStoredCustomerPaymentMethods } from '@/lib/storage/customerPaymentMethods';
import { SUGGESTED_CUISINES, SUGGESTED_DIETARY } from '@/lib/constants/preferenceCatalog';
import { BUSINESS_TYPES } from '@/lib/constants/businessTypes';

const getNextTier = getNextDinerTier;

function initialsFromName(name: string): string {
  return initialsFromDisplayName(name);
}

function formatVisitDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

function parsePreferenceInput(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toggleCommaPreference(raw: string, item: string): string {
  const trimmed = item.trim();
  if (!trimmed) return raw;
  const items = parsePreferenceInput(raw);
  const lower = trimmed.toLowerCase();
  const idx = items.findIndex((i) => i.toLowerCase() === lower);
  if (idx >= 0) {
    items.splice(idx, 1);
    return items.join(', ');
  }
  return [...items, trimmed].join(', ');
}

const savedRestaurants = isDemoModeEnabled() ? getSavedRestaurants() : [];

const ACCOUNT_ROWS = [
  { icon: 'notifications-outline' as const, title: 'Notifications', value: 'On', route: '/(customer)/profile/notifications' },
  { icon: 'star-outline' as const, title: 'My Reviews', value: null, route: '/(customer)/profile/my-reviews' },
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
  prefsInput: {
    minHeight: 42,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: c.textPrimary,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  prefsHint: {
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 17,
    marginTop: 8,
  },
  prefsPickLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textMuted,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  prefsPickScroll: {
    flexGrow: 0,
    marginBottom: 4,
  },
  prefsPickScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  prefsPickChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgBase,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  prefsPickChipOn: {
    borderColor: 'rgba(201,162,74,0.65)',
    backgroundColor: 'rgba(201,162,74,0.12)',
  },
  prefsPickChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textSecondary,
  },
  prefsPickChipTextOn: {
    color: c.gold,
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

  signOutBtn: {
    marginHorizontal: spacing.lg,
    paddingVertical: 15,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
  },
  deleteAccountBtn: {
    marginHorizontal: spacing.lg,
    paddingVertical: 15,
    borderRadius: borderRadius.lg,
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(227, 91, 91, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    flexDirection: 'row',
    gap: 8,
  },
  deleteAccountText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e35b5b',
  },
}));

function DiningPrefPickRow({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
}) {
  const styles = useStyles();
  const selected = useMemo(() => new Set(parsePreferenceInput(value).map((s) => s.toLowerCase())), [value]);

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.prefsPickScroll}
        contentContainerStyle={styles.prefsPickScrollContent}
      >
        {options.map((opt) => {
          const on = selected.has(opt.toLowerCase());
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(toggleCommaPreference(value, opt))}
              style={({ pressed }) => [
                styles.prefsPickChip,
                on && styles.prefsPickChipOn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.prefsPickChipText, on && styles.prefsPickChipTextOn]}>{opt}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const { effective, setMode } = useTheme();
  const { signOut, user } = useAuthSession();
  const [accountProfile, setAccountProfile] = useState<AppUserProfile | null>(null);
  const [recentVisits, setRecentVisits] = useState<MyBookingItem[]>([]);
  const [paymentLabel, setPaymentLabel] = useState('No card on file');
  const displayProfile = useMemo(
    () => ({
      ...resolveAuthDisplayProfile(user, { fullName: accountProfile?.fullName }),
      fullName: accountProfile?.fullName || resolveAuthDisplayProfile(user).fullName,
      email: accountProfile?.email || resolveAuthDisplayProfile(user).email,
      phone: accountProfile?.phone || resolveAuthDisplayProfile(user).phone,
    }),
    [accountProfile, user],
  );

  useEffect(() => {
    let active = true;
    void fetchCurrentUserProfile()
      .then((profile) => {
        if (active) setAccountProfile(profile);
      })
      .catch(() => {
        if (active) setAccountProfile(null);
      });
    void fetchMyBookingItems()
      .then((items) => {
        if (active) setRecentVisits(items.filter((item) => item.status === 'completed').slice(0, 3));
      })
      .catch(() => {
        if (active) setRecentVisits([]);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    void getStoredCustomerPaymentMethods(displayProfile.fullName)
      .then((cards) => {
        if (!active) return;
        const card = cards.find((item) => item.isDefault) ?? cards[0];
        setPaymentLabel(card ? `${card.brand.toUpperCase()} · ${card.last4}` : 'No card on file');
      })
      .catch(() => {
        if (active) setPaymentLabel('No card on file');
      });
    return () => {
      active = false;
    };
  }, [displayProfile.fullName]);

  async function handleLogout() {
    try {
      await signOut();
      router.replace('/onboarding');
    } catch (e: any) {
      Alert.alert('Logout failed', e?.message ?? 'Failed to log out. Please try again.');
    }
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This action is permanent and cannot be undone. Your account, reservations, reviews, and saved data will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              router.replace('/onboarding');
            } catch (e: any) {
              Alert.alert(
                'Delete failed',
                e?.message ?? 'Could not delete your account. Please try again.',
              );
            }
          },
        },
      ],
    );
  };

  const dinnersCount = recentVisits.length;
  const citiesCount = new Set(recentVisits.map((visit) => visit.restaurantName)).size;
  const points = accountProfile?.loyaltyPointsBalance ?? 0;
  const locationLabel = accountProfile?.locationLabel ?? 'No location on file';
  const memberSince = accountProfile?.createdAt
    ? new Date(accountProfile.createdAt).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })
    : 'new member';
  const currentTier = accountProfile?.loyaltyTier
    ? { name: accountProfile.loyaltyTier, min: dinnersCount }
    : getDinerTier(dinnersCount);
  const nextTier = getNextTier(dinnersCount);
  const dinnersUntilNext = nextTier ? nextTier.min - dinnersCount : 0;
  const progressRatio = nextTier ? dinnersCount / nextTier.min : 1;
  const initials = initialsFromName(displayProfile.fullName);
  const [cuisinePrefs, setCuisinePrefs] = useState('');
  const [dietaryPrefs, setDietaryPrefs] = useState('');
  const [placesPrefs, setPlacesPrefs] = useState('');
  const accountRows = useMemo(
    () => [
      ACCOUNT_ROWS[0],
      { icon: 'card-outline' as const, title: 'Payment methods', value: paymentLabel, route: '/(customer)/profile/payment' },
      ...ACCOUNT_ROWS.slice(1),
    ],
    [paymentLabel],
  );

  useEffect(() => {
    setCuisinePrefs(accountProfile?.preferredCuisines.join(', ') ?? '');
    setDietaryPrefs(accountProfile?.dietaryRestrictions.join(', ') ?? '');
    setPlacesPrefs(accountProfile?.preferredBusinessTypes.join(', ') ?? '');
  }, [accountProfile]);

  // Persist a dining-preference list to user_profiles whenever a chip toggles.
  // Demo mode is a no-op (no Supabase write); errors are silent so the UI
  // stays responsive — the optimistic local state has already updated.
  const persistPreference = useCallback(
    (
      column: 'preferred_cuisines' | 'dietary_restrictions' | 'preferred_business_types',
      next: string,
    ) => {
      if (isDemoModeEnabled()) return;
      const arr = parsePreferenceInput(next);
      void updateCurrentUserProfile({ [column]: arr.length > 0 ? arr : null }).catch(() => undefined);
    },
    [],
  );

  const handleCuisinePrefsChange = useCallback(
    (next: string) => {
      setCuisinePrefs(next);
      persistPreference('preferred_cuisines', next);
    },
    [persistPreference],
  );
  const handleDietaryPrefsChange = useCallback(
    (next: string) => {
      setDietaryPrefs(next);
      persistPreference('dietary_restrictions', next);
    },
    [persistPreference],
  );
  const handlePlacesPrefsChange = useCallback(
    (next: string) => {
      setPlacesPrefs(next);
      persistPreference('preferred_business_types', next);
    },
    [persistPreference],
  );

  function cycleTheme() {
    setMode(effective === 'dark' ? 'light' : 'dark');
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
        contentContainerStyle={{ paddingBottom: spacing.lg }}
      >
        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <View style={styles.avatarMeta}>
            <Text style={styles.userName}>{displayProfile.fullName}</Text>
            <Text style={styles.userLocation}>
              {locationLabel} · since {memberSince}
            </Text>
            {isLoyaltyEnabled() && (
              <View style={styles.tierBadge}>
                <Ionicons name="star" size={11} color={c.gold} />
                <Text style={styles.tierBadgeText}>{currentTier.name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Progress toward next tier */}
        {isLoyaltyEnabled() && nextTier && (
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
            <Text style={styles.statValue}>{dinnersCount}</Text>
            <Text style={styles.statLabel}>Dinners</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{citiesCount}</Text>
            <Text style={styles.statLabel}>Cities</Text>
          </View>
          {isLoyaltyEnabled() && (
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{points.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
          )}
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
              {r.coverPhotoUrl ? (
                <Image source={{ uri: r.coverPhotoUrl }} style={styles.savedPhoto} resizeMode="cover" />
              ) : (
                <View style={[styles.savedPhoto, { backgroundColor: '#0A0A0A' }]} />
              )}
              <View style={styles.savedBookmark}>
                <Ionicons name="bookmark" size={13} color={c.gold} />
              </View>
              <View style={styles.savedCardBody}>
                <Text style={styles.savedName} numberOfLines={1}>{r.name}</Text>
                <Text style={styles.savedMeta}>
                  {r.cuisineType} · {restaurantPriceLabel(r.priceRange)}
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
            <DiningPrefPickRow options={SUGGESTED_CUISINES} value={cuisinePrefs} onChange={handleCuisinePrefsChange} />
          </View>
          <View style={styles.prefsDivider} />
          <View>
            <Text style={styles.prefsSubTitle}>Dietary</Text>
            <DiningPrefPickRow options={SUGGESTED_DIETARY} value={dietaryPrefs} onChange={handleDietaryPrefsChange} />
          </View>
          <View style={styles.prefsDivider} />
          <View>
            <Text style={styles.prefsSubTitle}>Places</Text>
            <DiningPrefPickRow options={BUSINESS_TYPES} value={placesPrefs} onChange={handlePlacesPrefsChange} />
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
          {recentVisits.map((visit, idx) => (
              <View
                key={visit.id}
                style={[styles.visitRow, idx < recentVisits.length - 1 && styles.visitRowBorder]}
              >
                <View style={styles.visitThumb}>
                  {visit.coverPhotoUrl ? (
                    <Image
                      source={{ uri: visit.coverPhotoUrl }}
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
                    {formatVisitDate(visit.whenIso)} · {visit.partySize}{' '}
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
          ))}
        </View>

        {/* Account */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Account</Text>
        </View>
        <View style={styles.accountCard}>
          {accountRows.map((row, idx) => (
            <Pressable
              key={row.title}
              style={({ pressed }) => [
                styles.accountRow,
                idx < accountRows.length - 1 && styles.accountRowBorder,
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
          onPress={handleLogout}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>

        {/* Delete account */}
        <Pressable
          style={({ pressed }) => [styles.deleteAccountBtn, pressed && { opacity: 0.7 }]}
          onPress={handleDeleteAccount}
          accessibilityRole="button"
          accessibilityLabel="Delete account"
        >
          <Ionicons name="trash-outline" size={16} color="#e35b5b" />
          <Text style={styles.deleteAccountText}>Delete account</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
