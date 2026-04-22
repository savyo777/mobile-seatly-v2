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
import { ChevronSettingRow } from '@/components/profile/ChevronSettingRow';
import { ProfileSectionTitle } from '@/components/profile/ProfileSectionTitle';
import { useColors, useTheme, createStyles, spacing, borderRadius, typography } from '@/lib/theme';

const MEMBER_SINCE = new Date('2025-03-15');

function memberSinceLabel(): string {
  return MEMBER_SINCE.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

const TIERS = [
  { name: 'Bronze',   min: 0,    color: '#CD7F32' },
  { name: 'Silver',   min: 500,  color: '#A8A8B8' },
  { name: 'Gold',     min: 1500, color: '#C9A24A' },
  { name: 'Platinum', min: 3000, color: '#E2E2F0' },
] as const;

function getTier(pts: number) {
  const idx = TIERS.findIndex((_, i) => pts < (TIERS[i + 1]?.min ?? Infinity));
  return TIERS[Math.max(0, idx)];
}

function firstNameFromFull(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part || fullName;
}

const QUICK_TILES: { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; href: Href }[] = [
  { label: 'Bookings', icon: 'calendar-outline', href: '/(customer)/activity' },
  { label: 'Wallet',   icon: 'wallet-outline',   href: '/(customer)/profile/wallet' },
  { label: 'Saved',    icon: 'bookmark-outline', href: '/(customer)/profile/favorites' },
  { label: 'Rewards',  icon: 'gift-outline',     href: '/(customer)/profile/loyalty' },
];

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  topBarText: {
    flex: 1,
    paddingRight: spacing.md,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.5,
  },
  subline: {
    fontSize: 13,
    color: c.textMuted,
    marginTop: 2,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },

  profileHubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  profileHubRowPressed: {
    opacity: 0.8,
  },
  profileHubAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: c.bgElevated,
    borderWidth: 2,
    borderColor: '#C9A24A',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHubMeta: { flex: 1 },
  profileHubName: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.2,
  },
  profileHubDetail: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.sm,
  },
  tile: {
    width: '47.5%',
    flexGrow: 1,
    minWidth: '45%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    gap: 8,
  },
  tilePressed: {
    backgroundColor: c.bgElevated,
    borderColor: `${'#C9A24A'}40`,
  },
  tileIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${'#C9A24A'}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textPrimary,
    textAlign: 'center',
  },

  card: {
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${c.danger}30`,
    backgroundColor: `${c.danger}08`,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: c.danger },

  version: {
    fontSize: 11,
    color: c.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    opacity: 0.45,
    letterSpacing: 0.3,
  },
}));

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const { mode, effective } = useTheme();

  const pts = mockCustomer.loyaltyPointsBalance ?? 0;
  const tier = getTier(pts);
  const firstName = firstNameFromFull(mockCustomer.fullName);

  const appearanceSubtitle = mode === 'system'
    ? `System · ${effective === 'dark' ? 'Dark' : 'Light'}`
    : mode === 'dark' ? 'Dark' : 'Light';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Uber-style top: first name + contact info, settings gear */}
      <View style={styles.topBar}>
        <View style={styles.topBarText}>
          <Text style={styles.headline}>{firstName}</Text>
          <Text style={styles.subline} numberOfLines={1}>
            {mockCustomer.email}
          </Text>
          <Text style={styles.subline} numberOfLines={1}>
            {mockCustomer.phone}
          </Text>
        </View>
        <Pressable
          hitSlop={12}
          onPress={() => router.push('/(customer)/profile/settings')}
          style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={22} color={c.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* Profile summary row — tap to edit */}
        <Pressable
          onPress={() => router.push('/(customer)/profile/edit')}
          style={({ pressed }) => [styles.profileHubRow, pressed && styles.profileHubRowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
        >
          {mockCustomer.avatarUrl ? (
            <Image source={{ uri: mockCustomer.avatarUrl }} style={styles.profileHubAvatar} />
          ) : (
            <View style={[styles.profileHubAvatar, styles.avatarFallback]}>
              <Ionicons name="person" size={26} color={c.textMuted} />
            </View>
          )}
          <View style={styles.profileHubMeta}>
            <Text style={styles.profileHubName} numberOfLines={1}>
              {mockCustomer.fullName}
            </Text>
            <Text style={styles.profileHubDetail} numberOfLines={1}>
              {tier.name} · Member since {memberSinceLabel()}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
        </Pressable>

        {/* 2×2 quick-action grid */}
        <View style={styles.grid}>
          {QUICK_TILES.map((tile) => (
            <Pressable
              key={tile.label}
              onPress={() => router.push(tile.href)}
              style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
            >
              <View style={styles.tileIconWrap}>
                <Ionicons name={tile.icon} size={22} color={c.gold} />
              </View>
              <Text style={styles.tileLabel}>{tile.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Payments & perks */}
        <ProfileSectionTitle hub>Payments & perks</ProfileSectionTitle>
        <View style={styles.card}>
          <ChevronSettingRow icon="card-outline"     title="Payment methods" onPress={() => router.push('/(customer)/profile/payment')}    iconMuted />
          <ChevronSettingRow icon="pricetag-outline" title="Promotions"      onPress={() => router.push('/(customer)/profile/promotions')} iconMuted />
          <ChevronSettingRow icon="gift-outline"     title="Refer & earn"    onPress={() => router.push('/(customer)/profile/invite')}     iconMuted isLast />
        </View>

        {/* Security */}
        <ProfileSectionTitle hub>Security</ProfileSectionTitle>
        <View style={styles.card}>
          <ChevronSettingRow icon="shield-checkmark-outline" title="Security" subtitle="Password, biometrics, sessions" onPress={() => router.push('/(customer)/profile/security')} iconMuted isLast />
        </View>

        {/* Preferences */}
        <ProfileSectionTitle hub>Preferences</ProfileSectionTitle>
        <View style={styles.card}>
          <ChevronSettingRow icon="notifications-outline"  title="Notifications"  onPress={() => router.push('/(customer)/profile/notifications')} iconMuted />
          <ChevronSettingRow icon="contrast-outline"       title="Appearance"     subtitle={appearanceSubtitle} onPress={() => router.push('/(customer)/profile/appearance')}    iconMuted />
          <ChevronSettingRow icon="language-outline"       title="Language"       subtitle={mockCustomer.preferredLanguage === 'fr' ? 'Français' : 'English'} onPress={() => router.push('/(customer)/profile/language')} iconMuted />
          <ChevronSettingRow icon="lock-closed-outline"    title="Privacy"        onPress={() => router.push('/(customer)/profile/privacy')}       iconMuted isLast />
        </View>

        {/* Support */}
        <ProfileSectionTitle hub>Support</ProfileSectionTitle>
        <View style={styles.card}>
          <ChevronSettingRow icon="help-circle-outline"        title="Help"         onPress={() => router.push('/(customer)/profile/help')}  iconMuted />
          <ChevronSettingRow icon="information-circle-outline" title="About Seatly" onPress={() => router.push('/(customer)/profile/about')} iconMuted isLast />
        </View>

        {/* Legal */}
        <ProfileSectionTitle hub>Legal</ProfileSectionTitle>
        <View style={styles.card}>
          <ChevronSettingRow icon="document-text-outline" title="Terms of Service"   onPress={() => router.push('/(customer)/profile/legal/terms')}          iconMuted />
          <ChevronSettingRow icon="shield-outline"        title="Privacy Policy"     onPress={() => router.push('/(customer)/profile/legal/privacy-policy')}  iconMuted />
          <ChevronSettingRow icon="code-slash-outline"    title="Licenses"           onPress={() => router.push('/(customer)/profile/legal/licenses')}         iconMuted isLast />
        </View>

        {/* Sign out */}
        <Pressable
          onPress={() => router.replace('/(auth)/login' as Href)}
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.75 }]}
        >
          <Ionicons name="log-out-outline" size={18} color={c.danger} />
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>

        <Text style={styles.version}>Seatly · v2.1 · Build 204</Text>
      </ScrollView>
    </View>
  );
}
