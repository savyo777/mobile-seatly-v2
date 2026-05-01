import React, { useMemo } from 'react';

const MEMBER_SINCE = new Date('2025-03-15');
function memberSinceLabel(): string {
  return MEMBER_SINCE.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ChevronGlyph } from '@/components/ui/ChevronGlyph';
import { useColors, createStyles, spacing, borderRadius, typography } from '@/lib/theme';
import { mockCustomer } from '@/lib/mock/users';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { deleteAccount, signOutAllDevices } from '@/lib/services/accountSecurity';
import { setAppShellPreference } from '@/lib/navigation/appShellPreference';

const TIERS = [
  { name: 'Bronze',   min: 0,    color: '#CD7F32' },
  { name: 'Silver',   min: 500,  color: '#A8A8B8' },
  { name: 'Gold',     min: 1500, color: '#C9A84C' },
  { name: 'Platinum', min: 3000, color: '#E2E2F0' },
] as const;

function getTier(pts: number) {
  const idx = TIERS.findIndex((_, i) => pts < (TIERS[i + 1]?.min ?? Infinity));
  return TIERS[Math.max(0, idx)];
}

type Row =
  | {
      kind: 'nav';
      icon: React.ComponentProps<typeof Ionicons>['name'];
      label: string;
      href: Href;
    }
  | {
      kind: 'logoutAllDevices';
      icon: React.ComponentProps<typeof Ionicons>['name'];
      label: string;
    }
  | {
      kind: 'registerRestaurant';
      icon: React.ComponentProps<typeof Ionicons>['name'];
      label: string;
    }
  | {
      kind: 'switchToRestaurant';
      icon: React.ComponentProps<typeof Ionicons>['name'];
      label: string;
    };

type Section = {
  title: string;
  rows: Row[];
};

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 11,
    color: c.textMuted,
    fontWeight: '400',
  },

  // Scroll
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },

  // Profile bar
  profileBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(201,162,74,0.2)',
  },
  profileAvatarRing: {
    borderWidth: 2,
    borderColor: c.gold,
    borderRadius: 32,
    padding: 2,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.bgElevated,
  },
  profileAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.2 },
  profileHandle: { fontSize: 12, color: c.textMuted, marginTop: 2 },

  // Section
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionAccent: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: c.gold,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.9,
  },

  // Card
  card: {
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.05)' },
  rowIcon: { width: 24 },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: c.textPrimary,
  },
  ownerBanner: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(201,162,74,0.35)',
    backgroundColor: 'rgba(201,162,74,0.10)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ownerBannerText: {
    ...typography.bodySmall,
    color: c.textPrimary,
    lineHeight: 18,
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: c.danger },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.45)',
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  deleteText: { fontSize: 15, fontWeight: '700', color: c.danger },
}));

export default function SettingsScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut, isStaffLike } = useAuthSession();
  const pts = mockCustomer.loyaltyPointsBalance ?? 0;
  const tier = getTier(pts);

  const sections: Section[] = useMemo(() => {
    const restaurantRows: Row[] = [
      { kind: 'registerRestaurant', icon: 'storefront-outline', label: 'Register your restaurant' },
    ];
    if (isStaffLike) {
      restaurantRows.unshift({
        kind: 'switchToRestaurant',
        icon: 'swap-horizontal-outline',
        label: 'Switch to Restaurant View',
      });
    }
    const restaurantSection: Section = {
      title: 'For Restaurant Owners',
      rows: restaurantRows,
    };

    const core: Section[] = [
    {
      title: 'Account',
      rows: [
        { kind: 'nav', icon: 'pencil-outline', label: 'Edit Profile', href: '/(customer)/profile/edit' },
        {
          kind: 'logoutAllDevices',
          icon: 'globe-outline',
          label: 'Log out of all devices',
        },
      ],
    },
    {
      title: 'Account Security',
      rows: [
        {
          kind: 'nav',
          icon: 'lock-closed-outline',
          label: 'Change Password',
          href: '/(customer)/profile/security/change-password',
        },
        { kind: 'nav', icon: 'mail-outline', label: 'Change Email', href: '/(customer)/profile/security/change-email' },
      ],
    },
    {
      title: 'Payments & Rewards',
      rows: [
        { kind: 'nav', icon: 'card-outline', label: 'Payment Methods', href: '/(customer)/profile/payment' },
        { kind: 'nav', icon: 'wallet-outline', label: 'Wallet', href: '/(customer)/profile/wallet' },
        { kind: 'nav', icon: 'pricetag-outline', label: 'Promotions', href: '/(customer)/profile/promotions' },
      ],
    },
    {
      title: 'Saved',
      rows: [
        { kind: 'nav', icon: 'bookmark-outline', label: 'Saved Restaurants', href: '/(customer)/profile/favorites' },
      ],
    },
    {
      title: 'Preferences',
      rows: [
        {
          kind: 'nav',
          icon: 'notifications-outline',
          label: 'Notifications',
          href: '/(customer)/profile/notifications',
        },
        {
          kind: 'nav',
          icon: 'shield-checkmark-outline',
          label: 'Privacy & Security',
          href: '/(customer)/profile/privacy',
        },
      ],
    },
    {
      title: 'More',
      rows: [
        { kind: 'nav', icon: 'gift-outline', label: 'Refer & Earn', href: '/(customer)/profile/invite' },
        { kind: 'nav', icon: 'help-circle-outline', label: 'Help & Support', href: '/(customer)/profile/help' },
        {
          kind: 'nav',
          icon: 'information-circle-outline',
          label: 'About Seatly',
          href: '/(customer)/profile/about',
        },
      ],
    },
    ];
    return [restaurantSection, ...core];
  }, [isStaffLike]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/onboarding');
    } catch (e: any) {
      Alert.alert('Logout failed', e?.message ?? 'Failed to log out. Please try again.');
    }
  };

  const handleLogoutAllDevices = () => {
    Alert.alert(
      'Log out of all devices',
      'All active sessions will be signed out, including this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out of all devices',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOutAllDevices();
              router.replace('/onboarding');
            } catch (e: any) {
              Alert.alert(
                'Sign out failed',
                e?.message ?? 'Could not sign out all devices. Please try again.',
              );
            }
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This action is permanent and cannot be undone. Your account and data will be deleted.',
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

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="chevron-back" size={20} color={c.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSub}>
            {mockCustomer.fullName} · {tier.name} Member
          </Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 48 }]}
      >
        {/* Profile bar */}
        <Pressable
          onPress={() => router.push('/(customer)/profile/edit' as Href)}
          style={({ pressed }) => [styles.profileBar, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.profileAvatarRing}>
            {mockCustomer.avatarUrl ? (
              <Image source={{ uri: mockCustomer.avatarUrl }} style={styles.profileAvatar} />
            ) : (
              <View style={[styles.profileAvatar, styles.profileAvatarFallback]}>
                <Ionicons name="person" size={24} color={c.textMuted} />
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{mockCustomer.fullName}</Text>
            <Text style={styles.profileHandle}>Member since {memberSinceLabel()} · {tier.name}</Text>
          </View>
          <ChevronGlyph color={c.textMuted} size={16} />
        </Pressable>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            {/* Section label with gold left bar */}
            <View style={styles.sectionLabelRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionLabel}>{section.title.toUpperCase()}</Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
              {section.title === 'For Restaurant Owners' ? (
                <View style={styles.ownerBanner}>
                  <Text style={styles.ownerBannerText}>
                    Get 3 months free when you register your restaurant. After 3 months, billing begins
                    automatically.
                  </Text>
                </View>
              ) : null}
              {section.rows.map((row, i) => (
                <Pressable
                  key={row.label}
                  onPress={() => {
                    if (row.kind === 'logoutAllDevices') {
                      handleLogoutAllDevices();
                    } else if (row.kind === 'registerRestaurant') {
                      router.push('/(customer)/profile/register-restaurant' as Href);
                    } else if (row.kind === 'switchToRestaurant') {
                      void (async () => {
                        await setAppShellPreference('staff');
                        router.replace('/(staff)' as Href);
                      })();
                    } else {
                      router.push(row.href);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    i < section.rows.length - 1 && styles.rowBorder,
                    pressed && styles.rowPressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Ionicons name={row.icon} size={20} color={c.gold} style={styles.rowIcon} />
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <ChevronGlyph color={c.textMuted} size={16} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.75 }]}
        >
          <Ionicons name="log-out-outline" size={18} color={c.danger} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>

        {/* Delete account */}
        <Pressable
          onPress={handleDeleteAccount}
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.75 }]}
          accessibilityRole="button"
          accessibilityLabel="Delete account"
        >
          <Ionicons name="trash-outline" size={18} color={c.danger} />
          <Text style={styles.deleteText}>Delete account</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
