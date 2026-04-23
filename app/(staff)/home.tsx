import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { HomeBookingTrendCard } from '@/components/owner/HomeBookingTrendCard';
import {
  BOOKING_TREND_WEEK,
  LIVE_METRICS,
  OWNER_ALERTS_STRIP,
  WAITLIST_ENTRIES,
  WALKIN_QUEUE,
  OWNER_FLOOR_TABLES,
  OWNER_FIRST_NAME,
  OWNER_RESERVATIONS,
} from '@/lib/mock/ownerApp';
import { useOwnerTabScrollPadding } from '@/hooks/useOwnerTabScrollPadding';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  // ── Header (matches diner profile top bar exactly) ───────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  topBarText: { flex: 1, paddingRight: spacing.md },
  // Two-line greeting — same as diner discover screen
  greetingLine1: {
    fontSize: 28,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  greetingLine2: {
    fontSize: 28,
    fontWeight: '800',
    color: c.gold,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  subline: {
    fontSize: 13,
    color: c.textMuted,
    marginTop: 4,
  },
  // Settings/notif button — mirrors diner profile settingsBtn exactly
  notifBtn: {
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
  notifPressed: { opacity: 0.7 },
  badgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.danger,
    borderWidth: 1.5,
    borderColor: c.bgBase,
  },

  // ── Tonight snapshot ─────────────────────────────────────────────────────
  // Same card style as diner profile hub row
  snapshotCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    flexDirection: 'row',
    paddingVertical: spacing.lg,
  },
  snapshotCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
  },
  snapshotDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginVertical: 4,
  },
  snapshotValue: {
    fontSize: 32,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -1,
    lineHeight: 36,
  },
  snapshotValueGold: { color: c.gold },
  snapshotLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },

  // ── Section headers (exact DiscoverHorizontalSection pattern) ────────────
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.3,
    flex: 1,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.gold,
  },

  // ── Alert card ───────────────────────────────────────────────────────────
  alertCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 60,
  },
  alertRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  alertRowPressed: { backgroundColor: c.bgElevated },
  alertIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  alertTextCol: { flex: 1 },
  alertMsg: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
    lineHeight: 19,
  },
  alertSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },

  // All-clear
  allClearCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  allClearIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${c.success}18`,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  allClearTextCol: { flex: 1 },
  allClearTitle: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  allClearSub: { fontSize: 13, color: c.textMuted, marginTop: 2 },

  // ── Cal AI-style grouped action list ─────────────────────────────────────
  // One card, rows with dividers — identical to ChevronSettingRow container
  actionCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 68,
  },
  actionRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  actionRowPressed: { backgroundColor: c.bgElevated },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    flexShrink: 0,
  },
  actionTextCol: { flex: 1 },
  actionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.1,
  },
  actionSub: { fontSize: 13, color: c.textMuted, marginTop: 2 },

  // First row gets the gold icon treatment (primary action)
  actionIconPrimary: {
    backgroundColor: `${c.gold}18`,
    borderColor: `${c.gold}33`,
  },

  // ── Small secondary links row ─────────────────────────────────────────────
  linkRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  linkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    minHeight: 48,
  },
  linkLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: c.textPrimary },
  linkPressed: { opacity: 0.7 },
}));

function alertTone(severity: string, c: ReturnType<typeof useColors>) {
  if (severity === 'critical') return { bg: `${c.danger}22`, fg: c.danger };
  if (severity === 'warning')  return { bg: `${c.warning}22`, fg: c.warning };
  return { bg: c.bgElevated, fg: c.textSecondary };
}

function greetingFor(hour: number) {
  if (hour < 5)  return 'Late night,';
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  if (hour < 22) return 'Good evening,';
  return 'Good night,';
}

export default function OwnerHomeScreen() {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const scrollPad = useOwnerTabScrollPadding();
  const router = useRouter();

  const waitAvg =
    WALKIN_QUEUE.length > 0
      ? Math.round(WALKIN_QUEUE.reduce((a, b) => a + b.waitMins, 0) / WALKIN_QUEUE.length)
      : 0;
  const tablesOccupied = OWNER_FLOOR_TABLES.filter((t) => t.status === 'occupied').length;
  const tablesTotal    = OWNER_FLOOR_TABLES.length;

  const hour           = new Date().getHours();
  const greeting       = greetingFor(hour);
  const criticalCount  = OWNER_ALERTS_STRIP.filter((a) => a.severity === 'critical').length;
  const topAlerts      = OWNER_ALERTS_STRIP.slice(0, 3);
  const bookingsTonight = OWNER_RESERVATIONS.length;

  // Grouped action list (Cal AI style)
  const actions: { icon: IoniconName; label: string; sub: string; route: string; primary?: boolean }[] = [
    {
      icon: 'calendar-outline',
      label: 'Bookings',
      sub: `${LIVE_METRICS.tonightCovers} guests booked tonight`,
      route: '/(staff)/reservations',
      primary: true,
    },
    {
      icon: 'people-outline',
      label: 'Waitlist',
      sub: WAITLIST_ENTRIES.length === 0
        ? 'No one waiting right now'
        : `${WAITLIST_ENTRIES.length} guests waiting · ${waitAvg}m avg`,
      route: '/(staff)/waitlist',
    },
    {
      icon: 'pricetag-outline',
      label: 'Promotions',
      sub: 'View and manage your deals',
      route: '/(staff)/promotions',
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
        {/* ── Header — matches diner profile topBar ── */}
        <View style={styles.topBar}>
          <View style={styles.topBarText}>
            <Text style={styles.greetingLine1}>{greeting}</Text>
            <Text style={styles.greetingLine2}>{OWNER_FIRST_NAME}</Text>
            <Text style={styles.subline}>Nova Ristorante</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(staff)/notifications' as never)}
            style={({ pressed }) => [styles.notifBtn, pressed && styles.notifPressed]}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={18} color={c.textPrimary} />
            {criticalCount > 0 && <View style={styles.badgeDot} />}
          </Pressable>
        </View>

        {/* ── Booking trend — line chart (tables / reservations, not revenue) ── */}
        <HomeBookingTrendCard
          label="Bookings this week"
          headlineValue={String(bookingsTonight)}
          headlineHint="reservations on the books for tonight"
          dayLabels={BOOKING_TREND_WEEK.dayLabels}
          counts={BOOKING_TREND_WEEK.counts}
          vsPrevWeekPct={BOOKING_TREND_WEEK.vsPrevWeekPct}
          onPress={() => router.push('/(staff)/reservations' as never)}
        />

        {/* ── Tonight snapshot — 3 Uber-style status cells ── */}
        <View style={styles.snapshotCard}>
          <View style={styles.snapshotCell}>
            <Text style={[styles.snapshotValue, styles.snapshotValueGold]}>
              {tablesOccupied}
              <Text style={{ fontSize: 20, fontWeight: '600', color: c.textMuted }}>
                /{tablesTotal}
              </Text>
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
              {WAITLIST_ENTRIES.length === 0 ? 'No\nwait' : `Waiting\n${waitAvg}m avg`}
            </Text>
          </View>
        </View>

        {/* ── Heads up — DiscoverHorizontalSection header pattern ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Heads up</Text>
          {OWNER_ALERTS_STRIP.length > topAlerts.length && (
            <Pressable
              onPress={() => router.push('/(staff)/notifications' as never)}
              style={styles.seeAllBtn}
              hitSlop={8}
            >
              <Text style={styles.seeAllText}>See all</Text>
              <Ionicons name="chevron-forward" size={14} color={c.gold} />
            </Pressable>
          )}
        </View>

        {OWNER_ALERTS_STRIP.length === 0 ? (
          <View style={styles.allClearCard}>
            <View style={styles.allClearIcon}>
              <Ionicons name="checkmark" size={20} color={c.success} />
            </View>
            <View style={styles.allClearTextCol}>
              <Text style={styles.allClearTitle}>You're all good!</Text>
              <Text style={styles.allClearSub}>No issues need your attention right now</Text>
            </View>
          </View>
        ) : (
          <View style={styles.alertCard}>
            {topAlerts.map((a, i) => {
              const tone = alertTone(a.severity, c);
              return (
                <Pressable
                  key={a.id}
                  onPress={() => router.push('/(staff)/notifications' as never)}
                  style={({ pressed }) => [
                    styles.alertRow,
                    i > 0 && styles.alertRowDivider,
                    pressed && styles.alertRowPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={a.message}
                >
                  <View style={[styles.alertIconBox, { backgroundColor: tone.bg }]}>
                    <Ionicons
                      name={a.severity === 'critical' ? 'warning-outline' : 'information-circle-outline'}
                      size={18}
                      color={tone.fg}
                    />
                  </View>
                  <View style={styles.alertTextCol}>
                    <Text style={styles.alertMsg} numberOfLines={2}>{a.message}</Text>
                    <Text style={styles.alertSub}>Tap to view</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ── Quick access — Cal AI grouped list in one card ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick access</Text>
        </View>

        <View style={styles.actionCard}>
          {actions.map((action, i) => (
            <Pressable
              key={action.label}
              onPress={() => router.push(action.route as never)}
              style={({ pressed }) => [
                styles.actionRow,
                i > 0 && styles.actionRowDivider,
                pressed && styles.actionRowPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <View style={[styles.actionIconBox, action.primary && styles.actionIconPrimary]}>
                <Ionicons
                  name={action.icon}
                  size={20}
                  color={action.primary ? c.gold : c.textSecondary}
                />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Text style={styles.actionSub}>{action.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* ── Secondary links ── */}
        <View style={styles.linkRow}>
          <Pressable
            onPress={() => router.push('/(staff)/floor' as never)}
            style={({ pressed }) => [styles.linkBtn, pressed && styles.linkPressed]}
            accessibilityRole="button"
          >
            <Ionicons name="grid-outline" size={18} color={c.gold} />
            <Text style={styles.linkLabel}>Floor plan</Text>
            <Ionicons name="chevron-forward" size={14} color={c.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(staff)/analytics' as never)}
            style={({ pressed }) => [styles.linkBtn, pressed && styles.linkPressed]}
            accessibilityRole="button"
          >
            <Ionicons name="bar-chart-outline" size={18} color={c.gold} />
            <Text style={styles.linkLabel}>Analytics</Text>
            <Ionicons name="chevron-forward" size={14} color={c.textMuted} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
