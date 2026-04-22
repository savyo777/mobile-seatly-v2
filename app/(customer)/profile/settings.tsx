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
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ChevronGlyph } from '@/components/ui/ChevronGlyph';
import { useColors, createStyles, spacing, borderRadius, typography } from '@/lib/theme';
import { mockCustomer } from '@/lib/mock/users';

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

type Row = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  href: Href;
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
}));

export default function SettingsScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pts = mockCustomer.loyaltyPointsBalance ?? 0;
  const tier = getTier(pts);

  const sections: Section[] = useMemo(() => [
    {
      title: 'Account',
      rows: [
        { icon: 'pencil-outline', label: 'Edit Profile', href: '/(customer)/profile/edit' },
      ],
    },
    {
      title: 'Payments & Rewards',
      rows: [
        { icon: 'card-outline',     label: 'Payment Methods', href: '/(customer)/profile/payment' },
        { icon: 'wallet-outline',   label: 'Wallet',          href: '/(customer)/profile/wallet' },
        { icon: 'pricetag-outline', label: 'Promotions',      href: '/(customer)/profile/promotions' },
      ],
    },
    {
      title: 'Saved',
      rows: [
        { icon: 'bookmark-outline', label: 'Saved Restaurants', href: '/(customer)/profile/favorites' },
      ],
    },
    {
      title: 'Preferences',
      rows: [
        { icon: 'notifications-outline',    label: 'Notifications',      href: '/(customer)/profile/notifications' },
        { icon: 'shield-checkmark-outline', label: 'Privacy & Security', href: '/(customer)/profile/privacy' },
      ],
    },
    {
      title: 'More',
      rows: [
        { icon: 'gift-outline',               label: 'Refer & Earn',   href: '/(customer)/profile/invite' },
        { icon: 'help-circle-outline',        label: 'Help & Support', href: '/(customer)/profile/help' },
        { icon: 'information-circle-outline', label: 'About Seatly',   href: '/(customer)/profile/about' },
      ],
    },
  ], []);

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
              {section.rows.map((row, i) => (
                <Pressable
                  key={row.label}
                  onPress={() => router.push(row.href)}
                  style={({ pressed }) => [
                    styles.row,
                    i < section.rows.length - 1 && styles.rowBorder,
                    pressed && styles.rowPressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Ionicons name={row.icon} size={20} color={c.textSecondary} style={styles.rowIcon} />
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <ChevronGlyph color={c.textMuted} size={16} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <Pressable
          onPress={() => router.replace('/(auth)/login' as Href)}
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.75 }]}
        >
          <Ionicons name="log-out-outline" size={18} color={c.danger} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
