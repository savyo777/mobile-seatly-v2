import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatCard } from '@/components/owner/StatCard';
import { SectionCard } from '@/components/owner/SectionCard';
import { ChevronSettingRow } from '@/components/profile/ChevronSettingRow';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { useOwnerTabScrollPadding } from '@/hooks/useOwnerTabScrollPadding';
import {
  OWNER_BUSINESS_PROFILE,
  isBusinessOpenNow,
  OWNER_PROMOTIONS,
} from '@/lib/mock/ownerApp';

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  topTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.7,
    lineHeight: 36,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: {
    backgroundColor: c.bgElevated,
    transform: [{ scale: 0.96 }],
  },

  heroCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${c.gold}44`,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  cover: {
    width: '100%',
    height: 144,
    backgroundColor: c.bgElevated,
    position: 'relative',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  heroBody: {
    padding: spacing.lg,
    paddingTop: spacing.xl + 12,
    backgroundColor: c.bgSurface,
    gap: 4,
  },
  logoWrap: {
    position: 'absolute',
    left: spacing.lg,
    top: 144 - 36,
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: c.bgBase,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  logoInner: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoInitials: {
    fontSize: 24,
    fontWeight: '800',
    color: c.gold,
    letterSpacing: -0.5,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.4,
  },
  heroMeta: {
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '600',
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 10,
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
  },
  heroActionRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.bgSurface,
  },
  heroActionBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  heroActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textSecondary,
    letterSpacing: 0.2,
  },
  heroActionDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
  },
  heroActionPressed: {
    backgroundColor: c.bgElevated,
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
  const { effective } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const scrollPad = useOwnerTabScrollPadding();
  const router = useRouter();

  const profile = OWNER_BUSINESS_PROFILE;
  const openState = useMemo(() => isBusinessOpenNow(), []);
  const activePromos = OWNER_PROMOTIONS.filter((p) => p.status === 'live').length;

  const heroGradient =
    effective === 'dark'
      ? ([c.goldDark, '#1C1812', c.bgSurface] as const)
      : ([c.gold, '#ECE4D0', c.bgSurface] as const);

  const press = (fn: () => void) => () => {
    Haptics.selectionAsync().catch(() => {});
    fn();
  };

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
          <View>
            <Text style={styles.topTitle}>My Business</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            onPress={press(() => router.push('/(staff)/settings' as never))}
            accessibilityLabel="Open settings"
          >
            <Ionicons name="settings-outline" size={20} color={c.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.cover}>
            <LinearGradient
              colors={[...heroGradient]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.coverOverlay} />
          </View>
          <View style={styles.logoWrap}>
            <View style={styles.logoInner}>
              <Text style={styles.logoInitials}>{initials(profile.name)}</Text>
            </View>
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.heroName} numberOfLines={1}>
              {profile.name}
            </Text>
            <Text style={styles.heroMeta} numberOfLines={1}>
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
          <View style={styles.heroActionRow}>
            <Pressable
              style={({ pressed }) => [styles.heroActionBtn, pressed && styles.heroActionPressed]}
              onPress={press(() => router.push('/(staff)/profile/edit' as never))}
              accessibilityLabel="Edit business profile"
            >
              <Ionicons name="create-outline" size={18} color={c.textPrimary} />
              <Text style={styles.heroActionLabel}>Edit</Text>
            </Pressable>
            <View style={styles.heroActionDivider} />
            <Pressable
              style={({ pressed }) => [styles.heroActionBtn, pressed && styles.heroActionPressed]}
              onPress={press(() => router.push('/(staff)/promotions' as never))}
              accessibilityLabel="Open promotions"
            >
              <Ionicons name="pricetag-outline" size={18} color={c.textPrimary} />
              <Text style={styles.heroActionLabel}>Promotions</Text>
            </Pressable>
            <View style={styles.heroActionDivider} />
            <Pressable
              style={({ pressed }) => [styles.heroActionBtn, pressed && styles.heroActionPressed]}
              onPress={press(() => router.push('/(staff)/analytics' as never))}
              accessibilityLabel="Open analytics"
            >
              <Ionicons name="bar-chart-outline" size={18} color={c.textPrimary} />
              <Text style={styles.heroActionLabel}>Analytics</Text>
            </Pressable>
          </View>
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
