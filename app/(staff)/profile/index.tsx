import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatCard } from '@/components/owner/StatCard';
import { SectionCard } from '@/components/owner/SectionCard';
import { ChevronSettingRow } from '@/components/profile/ChevronSettingRow';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { useOwnerTabScrollPadding } from '@/hooks/useOwnerTabScrollPadding';
import {
  OWNER_BUSINESS_PROFILE,
  isBusinessOpenNow,
  OWNER_PROMOTIONS,
} from '@/lib/mock/ownerApp';

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  // Top bar — mirrors diner profile/index.tsx topBar exactly
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
  topTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.5,
  },
  topSubline: {
    fontSize: 13,
    color: c.textMuted,
    marginTop: 2,
  },
  // 38×38 — mirrors diner settingsBtn exactly
  iconBtn: {
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
  iconBtnPressed: {
    opacity: 0.7,
  },

  businessHubRow: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${c.gold}16`,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${c.gold}55`,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoInitials: {
    fontSize: 19,
    fontWeight: '800',
    color: c.gold,
    letterSpacing: -0.5,
  },
  businessMeta: {
    flex: 1,
    minWidth: 0,
  },
  businessName: {
    fontSize: 17,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.2,
  },
  businessDetail: {
    fontSize: 13,
    color: c.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  openPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  openDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  openPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroChangeText: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: '600',
    flexShrink: 1,
  },
  actionGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionTile: {
    flex: 1,
    minHeight: 74,
    borderRadius: borderRadius.md,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: spacing.xs,
  },
  actionTilePressed: {
    backgroundColor: c.bgElevated,
    borderColor: `${c.gold}40`,
  },
  actionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconWrapPrimary: {
    backgroundColor: `${c.gold}16`,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textPrimary,
    textAlign: 'center',
  },

  miniStatsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  miniStat: {
    flex: 1,
  },
}));

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function OwnerProfileScreen() {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const scrollPad = useOwnerTabScrollPadding();
  const router = useRouter();

  const profile = OWNER_BUSINESS_PROFILE;
  const openState = useMemo(() => isBusinessOpenNow(), []);
  const activePromos = OWNER_PROMOTIONS.filter((p) => p.status === 'live').length;

  const press = (fn: () => void) => () => {
    Haptics.selectionAsync().catch(() => {});
    fn();
  };

  const actionTiles = [
    {
      label: 'Edit',
      icon: 'create-outline' as const,
      route: '/(staff)/profile/edit',
      primary: true,
    },
    {
      label: 'Promos',
      icon: 'pricetag-outline' as const,
      route: '/(staff)/promotions',
    },
    {
      label: 'Analytics',
      icon: 'bar-chart-outline' as const,
      route: '/(staff)/analytics',
    },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.sm,
          paddingBottom: scrollPad,
        }}
      >
        <View style={styles.topBar}>
          <View style={styles.topBarText}>
            <Text style={styles.topTitle}>My Business</Text>
            <Text style={styles.topSubline}>{profile.name}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            onPress={press(() => router.push('/(staff)/settings' as never))}
            accessibilityLabel="Open settings"
          >
            <Ionicons name="settings-outline" size={18} color={c.textPrimary} />
          </Pressable>
        </View>

        <Pressable
          onPress={press(() => router.push('/(staff)/profile/edit' as never))}
          style={({ pressed }) => [styles.businessHubRow, pressed && { opacity: 0.82 }]}
          accessibilityRole="button"
          accessibilityLabel="Edit business profile"
        >
          <View style={styles.logoWrap}>
            <Text style={styles.logoInitials}>{initials(profile.name)}</Text>
          </View>
          <View style={styles.businessMeta}>
            <Text style={styles.businessName} numberOfLines={1}>
              {profile.name}
            </Text>
            <Text style={styles.businessDetail} numberOfLines={1}>
              {profile.cuisine} · {profile.neighborhood}
            </Text>
            <View style={styles.heroStatusRow}>
              <View
                style={[
                  styles.openPill,
                  {
                    backgroundColor: openState.open
                      ? `${c.success}1F`
                      : `${c.textMuted}22`,
                    borderColor: openState.open ? `${c.success}66` : c.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.openDot,
                    { backgroundColor: openState.open ? c.success : c.textMuted },
                  ]}
                />
                <Text
                  style={[
                    styles.openPillText,
                    { color: openState.open ? c.success : c.textMuted },
                  ]}
                >
                  {openState.open ? 'Open' : 'Closed'}
                </Text>
              </View>
              <Text style={styles.heroChangeText}>{openState.nextChange}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
        </Pressable>

        <View style={styles.actionGrid}>
          {actionTiles.map((action) => (
            <Pressable
              key={action.label}
              style={({ pressed }) => [styles.actionTile, pressed && styles.actionTilePressed]}
              onPress={press(() => router.push(action.route as never))}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <View style={[styles.actionIconWrap, action.primary && styles.actionIconWrapPrimary]}>
                <Ionicons name={action.icon} size={18} color={action.primary ? c.gold : c.textSecondary} />
              </View>
              <Text style={styles.actionLabel} numberOfLines={1}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.miniStatsRow}>
          <StatCard
            style={styles.miniStat}
            label="Rating"
            icon="star"
            tone="gold"
            accentValue
            value={profile.rating.toFixed(1)}
            caption={`${profile.reviewCount} reviews`}
          />
          <StatCard
            style={styles.miniStat}
            label="Followers"
            icon="people-outline"
            tone="default"
            value={
              profile.followerCount >= 1000
                ? `${(profile.followerCount / 1000).toFixed(1)}k`
                : String(profile.followerCount)
            }
            caption="All time"
          />
          <StatCard
            style={styles.miniStat}
            label="Live promos"
            icon="pricetag"
            tone={activePromos > 0 ? 'success' : 'default'}
            value={String(activePromos)}
            caption={activePromos > 0 ? 'Running now' : 'None active'}
          />
        </View>

        <SectionCard
          sectionTitle="Manage"
          icon="construct-outline"
        >
          <ChevronSettingRow
            title="Full analytics"
            subtitle="Top dishes, guest mix, heatmaps, and more"
            icon="bar-chart-outline"
            iconMuted
            onPress={press(() => router.push('/(staff)/analytics' as never))}
          />
          <ChevronSettingRow
            title="Guests"
            subtitle="CRM, VIPs, no-show risks"
            icon="people-outline"
            iconMuted
            onPress={press(() => router.push('/(staff)/guests' as never))}
          />
          <ChevronSettingRow
            title="Active promotions"
            subtitle={`${activePromos} live`}
            icon="pricetag-outline"
            iconMuted
            onPress={press(() => router.push('/(staff)/promotions' as never))}
            isLast
          />
        </SectionCard>

        <SectionCard sectionTitle="Account" icon="person-outline" marginBottom={spacing['2xl']}>
          <ChevronSettingRow
            title="Notifications"
            subtitle="Alerts and reminders"
            icon="notifications-outline"
            iconMuted
            onPress={press(() => router.push('/(staff)/notifications' as never))}
          />
          <ChevronSettingRow
            title="Settings"
            subtitle="Account and preferences"
            icon="settings-outline"
            iconMuted
            onPress={press(() => router.push('/(staff)/settings' as never))}
          />
          <ChevronSettingRow
            title="Switch to diner view"
            subtitle="Open the guest-facing app"
            icon="swap-horizontal-outline"
            iconMuted
            onPress={press(() => router.push('/(customer)/discover' as never))}
          />
          <ChevronSettingRow
            title="Sign out"
            subtitle="End owner session"
            icon="log-out-outline"
            iconMuted
            onPress={() =>
              Alert.alert('Sign out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign out', style: 'destructive' },
              ])
            }
            isLast
          />
        </SectionCard>
      </ScrollView>
    </View>
  );
}
