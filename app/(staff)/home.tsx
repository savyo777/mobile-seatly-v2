import React from 'react';
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
  type OwnerReservationSlot,
} from '@/lib/mock/ownerApp';
import { useOwnerTabScrollPadding } from '@/hooks/useOwnerTabScrollPadding';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const RESTAURANT_NAME = 'Nova Ristorante';

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  topBarText: { flex: 1, paddingRight: spacing.md },
  greetingLine1: {
    fontSize: 28,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  greetingLine2: {
    fontSize: 28,
    fontWeight: '800',
    color: c.gold,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  sublineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  subline: {
    fontSize: 13,
    color: c.textMuted,
    fontWeight: '500',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: `${c.success}16`,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${c.success}55`,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.success,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: c.success,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
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

  commandCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.lg,
  },
  commandTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  commandLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: c.gold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  commandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  commandSub: {
    fontSize: 13,
    color: c.textMuted,
    fontWeight: '500',
    marginTop: 4,
    lineHeight: 18,
  },
  commandIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: `${c.gold}16`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${c.gold}42`,
    flexShrink: 0,
  },
  commandStats: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    paddingTop: spacing.md,
  },
  commandStat: {
    flex: 1,
    minWidth: 0,
  },
  commandDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginHorizontal: spacing.md,
  },
  statValue: {
    fontSize: 25,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  statValueAccent: {
    color: c.gold,
  },
  statLabel: {
    fontSize: 11,
    color: c.textMuted,
    fontWeight: '700',
    marginTop: 2,
  },

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
    fontWeight: '700',
    color: c.gold,
  },

  attentionCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  attentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 62,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  rowPressed: { backgroundColor: c.bgElevated },
  attentionIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  attentionTextCol: { flex: 1, minWidth: 0 },
  attentionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.textPrimary,
    lineHeight: 19,
  },
  attentionSub: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  allClearIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${c.success}18`,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  timelineCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 68,
  },
  timeBlock: {
    width: 62,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.2,
  },
  partyText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    marginTop: 2,
  },
  guestCol: {
    flex: 1,
    minWidth: 0,
  },
  guestName: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.1,
  },
  guestMeta: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: '500',
    marginTop: 3,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  actionTile: {
    width: '47.5%',
    flexGrow: 1,
    minWidth: '45%',
    minHeight: 86,
    borderRadius: borderRadius.md,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  actionTilePressed: {
    backgroundColor: c.bgElevated,
    borderColor: `${c.gold}44`,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  actionIconPrimary: {
    backgroundColor: `${c.gold}16`,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.1,
  },
  actionSub: {
    fontSize: 11,
    color: c.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
}));

function alertTone(severity: string, c: ReturnType<typeof useColors>) {
  if (severity === 'critical') return { bg: `${c.danger}18`, fg: c.danger };
  if (severity === 'warning') return { bg: `${c.warning}20`, fg: c.warning };
  return { bg: c.bgElevated, fg: c.textSecondary };
}

function statusTone(status: OwnerReservationSlot['status'], c: ReturnType<typeof useColors>) {
  if (status === 'risk') return { bg: `${c.danger}16`, border: `${c.danger}44`, fg: c.danger, label: 'Risk' };
  if (status === 'pending') return { bg: `${c.warning}18`, border: `${c.warning}44`, fg: c.warning, label: 'Pending' };
  if (status === 'seated') return { bg: `${c.success}16`, border: `${c.success}44`, fg: c.success, label: 'Seated' };
  return { bg: c.bgElevated, border: c.border, fg: c.textSecondary, label: 'Booked' };
}

function greetingFor(hour: number) {
  if (hour < 5) return 'Late night,';
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
  const seatedTables = OWNER_FLOOR_TABLES.filter((t) => t.status === 'occupied').length;
  const tablesTotal = OWNER_FLOOR_TABLES.length;
  const hour = new Date().getHours();
  const greeting = greetingFor(hour);
  const criticalCount = OWNER_ALERTS_STRIP.filter((a) => a.severity === 'critical').length;
  const bookingsTonight = OWNER_RESERVATIONS.length;
  const riskCount = OWNER_RESERVATIONS.filter((r) => r.status === 'risk').length;
  const pendingCount = OWNER_RESERVATIONS.filter((r) => r.status === 'pending').length;
  const topAlerts = OWNER_ALERTS_STRIP.slice(0, 2);
  const timeline = OWNER_RESERVATIONS.slice(0, 4);

  const quickActions: {
    icon: IoniconName;
    label: string;
    sub: string;
    route: string;
    primary?: boolean;
  }[] = [
    {
      icon: 'calendar-outline',
      label: 'Reservations',
      sub: `${bookingsTonight} tonight`,
      route: '/(staff)/reservations',
      primary: true,
    },
    {
      icon: 'pricetag-outline',
      label: 'Post promo',
      sub: 'Fill slow slots',
      route: '/(staff)/promotions/new',
    },
    {
      icon: 'grid-outline',
      label: 'Floor',
      sub: `${seatedTables}/${tablesTotal} seated`,
      route: '/(staff)/floor',
    },
    {
      icon: 'people-outline',
      label: 'Waitlist',
      sub: WAITLIST_ENTRIES.length === 0 ? 'Clear' : `${WAITLIST_ENTRIES.length} waiting`,
      route: '/(staff)/waitlist',
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
            <Text style={styles.greetingLine1}>{greeting}</Text>
            <Text style={styles.greetingLine2}>{OWNER_FIRST_NAME}</Text>
            <View style={styles.sublineRow}>
              <Text style={styles.subline}>{RESTAURANT_NAME}</Text>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            </View>
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

        <Pressable
          onPress={() => router.push('/(staff)/reservations' as never)}
          style={({ pressed }) => [styles.commandCard, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Open reservations"
        >
          <View style={styles.commandTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.commandLabel}>Tonight</Text>
              <Text style={styles.commandTitle}>{bookingsTonight} reservations on deck</Text>
              <Text style={styles.commandSub}>
                {LIVE_METRICS.tonightCovers} covers booked. {pendingCount} need confirmation.
              </Text>
            </View>
            <View style={styles.commandIcon}>
              <Ionicons name="calendar" size={22} color={c.gold} />
            </View>
          </View>
          <View style={styles.commandStats}>
            <View style={styles.commandStat}>
              <Text style={[styles.statValue, styles.statValueAccent]}>{bookingsTonight}</Text>
              <Text style={styles.statLabel}>Reservations</Text>
            </View>
            <View style={styles.commandDivider} />
            <View style={styles.commandStat}>
              <Text style={styles.statValue}>{LIVE_METRICS.tonightCovers}</Text>
              <Text style={styles.statLabel}>Covers</Text>
            </View>
            <View style={styles.commandDivider} />
            <View style={styles.commandStat}>
              <Text style={styles.statValue}>{WAITLIST_ENTRIES.length}</Text>
              <Text style={styles.statLabel}>{waitAvg > 0 ? `${waitAvg}m wait` : 'Waitlist'}</Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Needs attention</Text>
          {OWNER_ALERTS_STRIP.length > topAlerts.length ? (
            <Pressable
              onPress={() => router.push('/(staff)/notifications' as never)}
              style={styles.seeAllBtn}
              hitSlop={8}
            >
              <Text style={styles.seeAllText}>See all</Text>
              <Ionicons name="chevron-forward" size={14} color={c.gold} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.attentionCard}>
          {topAlerts.length === 0 ? (
            <View style={styles.attentionRow}>
              <View style={styles.allClearIcon}>
                <Ionicons name="checkmark" size={18} color={c.success} />
              </View>
              <View style={styles.attentionTextCol}>
                <Text style={styles.attentionTitle}>Everything looks controlled</Text>
                <Text style={styles.attentionSub}>No urgent reservation or floor issues</Text>
              </View>
            </View>
          ) : (
            topAlerts.map((alert, index) => {
              const tone = alertTone(alert.severity, c);
              return (
                <Pressable
                  key={alert.id}
                  onPress={() => router.push('/(staff)/notifications' as never)}
                  style={({ pressed }) => [
                    styles.attentionRow,
                    index > 0 && styles.rowDivider,
                    pressed && styles.rowPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={alert.message}
                >
                  <View style={[styles.attentionIcon, { backgroundColor: tone.bg }]}>
                    <Ionicons
                      name={alert.severity === 'critical' ? 'warning-outline' : 'time-outline'}
                      size={18}
                      color={tone.fg}
                    />
                  </View>
                  <View style={styles.attentionTextCol}>
                    <Text style={styles.attentionTitle} numberOfLines={2}>
                      {alert.message}
                    </Text>
                    <Text style={styles.attentionSub}>
                      {alert.severity === 'critical' ? 'Handle now' : 'Watch closely'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
                </Pressable>
              );
            })
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Reservation flow</Text>
          <Pressable
            onPress={() => router.push('/(staff)/reservations' as never)}
            style={styles.seeAllBtn}
            hitSlop={8}
          >
            <Text style={styles.seeAllText}>Manage</Text>
            <Ionicons name="chevron-forward" size={14} color={c.gold} />
          </Pressable>
        </View>

        <View style={styles.timelineCard}>
          {timeline.map((reservation, index) => {
            const tone = statusTone(reservation.status, c);
            return (
              <Pressable
                key={reservation.id}
                onPress={() => router.push('/(staff)/reservations' as never)}
                style={({ pressed }) => [
                  styles.timelineRow,
                  index > 0 && styles.rowDivider,
                  pressed && styles.rowPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${reservation.guestName} at ${reservation.startTime}`}
              >
                <View style={styles.timeBlock}>
                  <Text style={styles.timeText}>{reservation.startTime}</Text>
                  <Text style={styles.partyText}>Party {reservation.partySize}</Text>
                </View>
                <View style={styles.guestCol}>
                  <Text style={styles.guestName} numberOfLines={1}>
                    {reservation.guestName}
                  </Text>
                  <Text style={styles.guestMeta} numberOfLines={1}>
                    {reservation.table ? reservation.table : 'Table not assigned'}
                    {reservation.vip ? ' · VIP' : ''}
                    {reservation.notes ? ` · ${reservation.notes}` : ''}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                  <Text style={[styles.statusText, { color: tone.fg }]}>{tone.label}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
        </View>

        <View style={styles.actionGrid}>
          {quickActions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => router.push(action.route as never)}
              style={({ pressed }) => [styles.actionTile, pressed && styles.actionTilePressed]}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <View style={[styles.actionIconWrap, action.primary && styles.actionIconPrimary]}>
                <Ionicons name={action.icon} size={19} color={action.primary ? c.gold : c.textSecondary} />
              </View>
              <View>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Text style={styles.actionSub}>{action.sub}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <HomeBookingTrendCard
          label="Reservation momentum"
          headlineValue={`${riskCount} risk`}
          headlineHint={`${BOOKING_TREND_WEEK.vsPrevWeekPct}% more bookings than last week`}
          dayLabels={BOOKING_TREND_WEEK.dayLabels}
          counts={BOOKING_TREND_WEEK.counts}
          vsPrevWeekPct={BOOKING_TREND_WEEK.vsPrevWeekPct}
          onPress={() => router.push('/(staff)/reservations' as never)}
        />
      </ScrollView>
    </View>
  );
}
