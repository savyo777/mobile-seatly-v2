import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { HomeHero } from '@/components/owner/HomeHero';
import {
  REVENUE_DATA,
  LIVE_METRICS,
  OWNER_ALERTS_STRIP,
  WAITLIST_ENTRIES,
  WALKIN_QUEUE,
  OWNER_FLOOR_TABLES,
  OWNER_FIRST_NAME,
} from '@/lib/mock/ownerApp';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { useOwnerTabScrollPadding } from '@/hooks/useOwnerTabScrollPadding';

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  // ── Top bar ──────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  topLeft: { gap: 2 },
  greeting: {
    fontSize: 13,
    fontWeight: '600',
    color: c.gold,
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.7,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textSecondary,
    marginTop: 2,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifPressed: {
    backgroundColor: c.bgElevated,
    transform: [{ scale: 0.96 }],
  },
  badgeWrap: {
    position: 'absolute',
    top: 7,
    right: 7,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: c.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },

  // ── Tonight snapshot ─────────────────────────────────────────────────────
  snapshotCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  snapshotCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 4,
  },
  snapshotValue: {
    fontSize: 30,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  snapshotValueGold: { color: c.gold },
  snapshotLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 15,
  },
  snapshotDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginVertical: 4,
  },

  // ── Section labels (plain, conversational) ───────────────────────────────
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.1,
  },
  seeAllBtn: {
    fontSize: 13,
    fontWeight: '700',
    color: c.gold,
  },

  // ── Alerts ───────────────────────────────────────────────────────────────
  attentionCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
    minHeight: 64,
  },
  alertRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  alertTextCol: { flex: 1, gap: 2 },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.textPrimary,
    lineHeight: 19,
  },
  alertSub: {
    fontSize: 12,
    fontWeight: '500',
    color: c.textMuted,
  },
  allClearCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: 8,
  },
  allClearCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${c.success}1A`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allClearTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
  },
  allClearSub: {
    fontSize: 13,
    color: c.textMuted,
    fontWeight: '500',
  },

  // ── Big action buttons ───────────────────────────────────────────────────
  actionsCol: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionBtn: {
    minHeight: 76,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionPrimary: {
    backgroundColor: c.gold,
    shadowColor: c.gold,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  actionSecondary: {
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionIconPrimary: { backgroundColor: 'rgba(255,255,255,0.22)' },
  actionIconSecondary: { backgroundColor: `${c.gold}1A` },
  actionTextCol: { flex: 1, gap: 3 },
  actionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  actionTitleSecondary: {
    fontSize: 16,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.2,
  },
  actionSub: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  actionSubSecondary: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textMuted,
  },
  actionPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },

  // ── Small link row ───────────────────────────────────────────────────────
  linkRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  linkBtn: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  linkLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: c.textPrimary,
  },
}));

function alertTone(s: string, c: ReturnType<typeof useColors>): { bg: string; fg: string } {
  if (s === 'critical') return { bg: `${c.danger}22`, fg: c.danger };
  if (s === 'warning') return { bg: `${c.warning}22`, fg: c.warning };
  return { bg: c.bgElevated, fg: c.textSecondary };
}

function greetingFor(hour: number): string {
  if (hour < 5) return 'Late night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Good night';
}

export default function OwnerHomeScreen() {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const scrollPad = useOwnerTabScrollPadding();
  const router = useRouter();

  const day = REVENUE_DATA.day;
  const trendUp = day.trendPct >= 0;
  const healthSummary = useMemo(
    () =>
      trendUp
        ? `Tracking ${day.trendPct}% ahead of last week.`
        : `Pacing ${Math.abs(day.trendPct)}% behind last week — a promo could help.`,
    [trendUp, day.trendPct],
  );

  const waitAvg =
    WALKIN_QUEUE.length > 0
      ? Math.round(WALKIN_QUEUE.reduce((a, b) => a + b.waitMins, 0) / WALKIN_QUEUE.length)
      : 0;
  const tablesOccupied = OWNER_FLOOR_TABLES.filter((t) => t.status === 'occupied').length;
  const tablesTotal = OWNER_FLOOR_TABLES.length;

  const hour = new Date().getHours();
  const greeting = greetingFor(hour);
  const criticalCount = OWNER_ALERTS_STRIP.filter((a) => a.severity === 'critical').length;
  const topAlerts = OWNER_ALERTS_STRIP.slice(0, 2);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.sm,
          paddingBottom: scrollPad,
        }}
      >
        {/* ── Single clean header ── */}
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            <Text style={styles.greeting}>{greeting}, {OWNER_FIRST_NAME}</Text>
            <Text style={styles.title}>Tonight</Text>
            <Text style={styles.subtitle}>Nova Ristorante</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(staff)/notifications' as never)}
            style={({ pressed }) => [styles.notifBtn, pressed && styles.notifPressed]}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={20} color={c.textPrimary} />
            {criticalCount > 0 && (
              <View style={styles.badgeWrap}>
                <Text style={styles.badgeText}>{criticalCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* ── Revenue hero (tap for full analytics) ── */}
        <HomeHero
          label="Revenue today"
          value={formatCurrency(day.total, 'cad')}
          trendLabel={`${trendUp ? '+' : ''}${day.trendPct}%`}
          trendPositive={trendUp}
          healthSummary={healthSummary}
          sparkline={day.series}
          currentIndex={Math.min(day.series.length - 1, Math.max(0, hour - 11))}
          onPress={() => router.push('/(staff)/analytics' as never)}
        />

        {/* ── Tonight at a glance ── */}
        <View style={styles.snapshotCard}>
          <View style={styles.snapshotCell}>
            <Text style={[styles.snapshotValue, styles.snapshotValueGold]}>
              {tablesOccupied}
              <Text style={{ fontSize: 20, color: c.textMuted }}>/{tablesTotal}</Text>
            </Text>
            <Text style={styles.snapshotLabel}>Tables{'\n'}seated</Text>
          </View>
          <View style={styles.snapshotDivider} />
          <View style={styles.snapshotCell}>
            <Text style={styles.snapshotValue}>{LIVE_METRICS.tonightCovers}</Text>
            <Text style={styles.snapshotLabel}>Guests{'\n'}tonight</Text>
          </View>
          <View style={styles.snapshotDivider} />
          <View style={styles.snapshotCell}>
            <Text style={styles.snapshotValue}>{WAITLIST_ENTRIES.length}</Text>
            <Text style={styles.snapshotLabel}>
              {WAITLIST_ENTRIES.length === 0 ? 'No wait' : `Waiting\n${waitAvg}m avg`}
            </Text>
          </View>
        </View>

        {/* ── Alerts ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>Heads up</Text>
          {OWNER_ALERTS_STRIP.length > topAlerts.length && (
            <Pressable
              onPress={() => router.push('/(staff)/notifications' as never)}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.seeAllBtn}>See all</Text>
            </Pressable>
          )}
        </View>

        {OWNER_ALERTS_STRIP.length === 0 ? (
          <View style={styles.allClearCard}>
            <View style={styles.allClearCircle}>
              <Ionicons name="checkmark" size={22} color={c.success} />
            </View>
            <Text style={styles.allClearTitle}>You're all good!</Text>
            <Text style={styles.allClearSub}>No issues need your attention right now</Text>
          </View>
        ) : (
          <View style={styles.attentionCard}>
            {topAlerts.map((a, i) => {
              const tone = alertTone(a.severity, c);
              const isWarning = a.severity === 'critical' || a.severity === 'warning';
              return (
                <Pressable
                  key={a.id}
                  onPress={() => router.push('/(staff)/notifications' as never)}
                  style={({ pressed }) => [
                    styles.alertRow,
                    i > 0 && styles.alertRowDivider,
                    pressed && { backgroundColor: c.bgElevated },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={a.message}
                >
                  <View style={[styles.alertIcon, { backgroundColor: tone.bg }]}>
                    <Ionicons
                      name={isWarning ? 'warning-outline' : 'information-circle-outline'}
                      size={18}
                      color={tone.fg}
                    />
                  </View>
                  <View style={styles.alertTextCol}>
                    <Text style={styles.alertTitle} numberOfLines={2}>{a.message}</Text>
                    <Text style={styles.alertSub}>Tap to view details</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ── Main actions (stacked for clarity) ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>Quick access</Text>
        </View>

        <View style={styles.actionsCol}>
          <Pressable
            onPress={() => router.push('/(staff)/reservations' as never)}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionPrimary,
              pressed && styles.actionPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open bookings"
          >
            <View style={[styles.actionIconWrap, styles.actionIconPrimary]}>
              <Ionicons name="calendar" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.actionTextCol}>
              <Text style={styles.actionTitle}>Bookings</Text>
              <Text style={styles.actionSub}>
                {LIVE_METRICS.tonightCovers} guests booked tonight
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>

          <Pressable
            onPress={() => router.push('/(staff)/waitlist' as never)}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionSecondary,
              pressed && styles.actionPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open waitlist"
          >
            <View style={[styles.actionIconWrap, styles.actionIconSecondary]}>
              <Ionicons name="people" size={24} color={c.gold} />
            </View>
            <View style={styles.actionTextCol}>
              <Text style={styles.actionTitleSecondary}>Waitlist</Text>
              <Text style={styles.actionSubSecondary}>
                {WAITLIST_ENTRIES.length === 0
                  ? 'No one waiting right now'
                  : `${WAITLIST_ENTRIES.length} guests waiting · ${waitAvg}m avg wait`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/(staff)/promotions' as never)}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionSecondary,
              pressed && styles.actionPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open promotions"
          >
            <View style={[styles.actionIconWrap, styles.actionIconSecondary]}>
              <Ionicons name="pricetag" size={24} color={c.gold} />
            </View>
            <View style={styles.actionTextCol}>
              <Text style={styles.actionTitleSecondary}>Promotions</Text>
              <Text style={styles.actionSubSecondary}>Manage your deals and offers</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </Pressable>
        </View>

        {/* ── Secondary links ── */}
        <View style={styles.linkRow}>
          <Pressable
            onPress={() => router.push('/(staff)/floor' as never)}
            style={({ pressed }) => [styles.linkBtn, pressed && styles.actionPressed]}
            accessibilityRole="button"
          >
            <Ionicons name="grid-outline" size={18} color={c.gold} />
            <Text style={styles.linkLabel}>Floor plan</Text>
            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(staff)/analytics' as never)}
            style={({ pressed }) => [styles.linkBtn, pressed && styles.actionPressed]}
            accessibilityRole="button"
          >
            <Ionicons name="trending-up-outline" size={18} color={c.gold} />
            <Text style={styles.linkLabel}>Analytics</Text>
            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
