import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { OwnerHeader } from '@/components/owner/OwnerHeader';
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
  greetingKicker: {
    paddingHorizontal: spacing.lg,
    marginBottom: 2,
  },
  kickerText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.gold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // One compact "Tonight at a glance" card: 3 metrics, no icons, one line each
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
    gap: 4,
    paddingHorizontal: 4,
  },
  snapshotValue: {
    fontSize: 26,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.6,
  },
  snapshotValueGold: {
    color: c.gold,
  },
  snapshotLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  snapshotDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginVertical: 4,
  },

  // Section title (used above Attention + Actions)
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: c.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '800',
    color: c.gold,
    letterSpacing: 0.3,
  },

  // Attention list (zero or top 2 items)
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
    paddingVertical: 14,
    minHeight: 60,
  },
  alertDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: c.textPrimary,
    fontWeight: '600',
    lineHeight: 19,
  },
  allClearCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  allClearIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${c.success}1A`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allClearText: {
    fontSize: 14,
    color: c.textPrimary,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  allClearSub: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: '500',
  },

  // Two big actions — 72pt tall, generous spacing, clear primary/secondary
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  actionBtn: {
    flex: 1,
    minHeight: 72,
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
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconPrimary: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  actionIconSecondary: {
    backgroundColor: `${c.gold}1A`,
  },
  actionLabelCol: {
    flex: 1,
    gap: 2,
  },
  actionLabelPrimary: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  actionSublabelPrimary: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.2,
  },
  actionLabelSecondary: {
    fontSize: 15,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.2,
  },
  actionSublabelSecondary: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.2,
  },
  actionPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },

  // Secondary link row for less-used destinations
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
    fontSize: 13,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.1,
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
        ? `Tracking ${day.trendPct}% ahead of last week — momentum is good.`
        : `Pacing ${Math.abs(day.trendPct)}% behind last week — consider a quick promo.`,
    [trendUp, day.trendPct],
  );
  const waitAvg =
    WALKIN_QUEUE.length > 0
      ? Math.round(WALKIN_QUEUE.reduce((a, b) => a + b.waitMins, 0) / WALKIN_QUEUE.length)
      : 0;
  const tablesOccupied = OWNER_FLOOR_TABLES.filter((t) => t.status === 'occupied').length;
  const tablesTotal = OWNER_FLOOR_TABLES.length;

  const now = new Date();
  const hour = now.getHours();
  const greeting = greetingFor(hour);

  const criticalCount = OWNER_ALERTS_STRIP.filter((a) => a.severity === 'critical').length;
  const topAlerts = OWNER_ALERTS_STRIP.slice(0, 2);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xs,
          paddingBottom: scrollPad,
        }}
      >
        <View style={styles.greetingKicker}>
          <Text style={styles.kickerText}>
            {greeting}, {OWNER_FIRST_NAME}
          </Text>
        </View>
        <OwnerHeader
          title="Tonight"
          subtitle="Nova Ristorante"
          rightIcon="notifications-outline"
          onRightPress={() => router.push('/(staff)/notifications')}
          accessibilityLabelRight="Notifications"
          rightBadgeCount={criticalCount}
        />

        <HomeHero
          label="Revenue · today"
          value={formatCurrency(day.total, 'cad')}
          trendLabel={`${trendUp ? '+' : ''}${day.trendPct}%`}
          trendPositive={trendUp}
          healthSummary={healthSummary}
          sparkline={day.series}
          currentIndex={Math.min(day.series.length - 1, Math.max(0, hour - 11))}
          onPress={() => router.push('/(staff)/analytics' as never)}
        />

        {/* Tonight at a glance — 3 numbers, plain labels, one compact card */}
        <View
          style={styles.snapshotCard}
          accessibilityRole="summary"
          accessibilityLabel={`Tonight: ${tablesOccupied} of ${tablesTotal} tables seated, ${LIVE_METRICS.tonightCovers} covers booked, ${WAITLIST_ENTRIES.length} on waitlist with ${waitAvg} minute average wait.`}
        >
          <View style={styles.snapshotCell}>
            <Text style={[styles.snapshotValue, styles.snapshotValueGold]}>
              {tablesOccupied}
              <Text style={{ fontSize: 18, color: c.textMuted }}>/{tablesTotal}</Text>
            </Text>
            <Text style={styles.snapshotLabel}>Seated now</Text>
          </View>
          <View style={styles.snapshotDivider} />
          <View style={styles.snapshotCell}>
            <Text style={styles.snapshotValue}>{LIVE_METRICS.tonightCovers}</Text>
            <Text style={styles.snapshotLabel}>Guests tonight</Text>
          </View>
          <View style={styles.snapshotDivider} />
          <View style={styles.snapshotCell}>
            <Text style={styles.snapshotValue}>{WAITLIST_ENTRIES.length}</Text>
            <Text style={styles.snapshotLabel}>
              {WAITLIST_ENTRIES.length === 0 ? 'No wait' : `Waiting · ${waitAvg}m`}
            </Text>
          </View>
        </View>

        {/* Needs attention */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Needs your attention</Text>
          {OWNER_ALERTS_STRIP.length > topAlerts.length ? (
            <Pressable
              onPress={() => router.push('/(staff)/notifications' as never)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="See all notifications"
            >
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          ) : null}
        </View>

        {OWNER_ALERTS_STRIP.length === 0 ? (
          <View style={styles.allClearCard}>
            <View style={styles.allClearIconWrap}>
              <Ionicons name="checkmark" size={22} color={c.success} />
            </View>
            <Text style={styles.allClearText}>All clear</Text>
            <Text style={styles.allClearSub}>Nothing needs you right now</Text>
          </View>
        ) : (
          <View style={styles.attentionCard}>
            {topAlerts.map((a, i) => {
              const tone = alertTone(a.severity, c);
              return (
                <Pressable
                  key={a.id}
                  onPress={() => router.push('/(staff)/notifications' as never)}
                  style={({ pressed }) => [
                    styles.alertRow,
                    i > 0 && styles.alertDivider,
                    pressed && { backgroundColor: c.bgElevated },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={a.message}
                >
                  <View style={[styles.alertIcon, { backgroundColor: tone.bg }]}>
                    <Ionicons
                      name={a.severity === 'critical' ? 'warning' : 'alert-circle-outline'}
                      size={16}
                      color={tone.fg}
                    />
                  </View>
                  <Text style={styles.alertText} numberOfLines={2}>
                    {a.message}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Two big, obvious actions */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Do now</Text>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => router.push('/(staff)/reservations' as never)}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionPrimary,
              pressed && styles.actionPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open reservations"
          >
            <View style={[styles.actionIconWrap, styles.actionIconPrimary]}>
              <Ionicons name="calendar" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.actionLabelCol}>
              <Text style={styles.actionLabelPrimary}>Reservations</Text>
              <Text style={styles.actionSublabelPrimary}>
                {LIVE_METRICS.tonightCovers} guests tonight
              </Text>
            </View>
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
              <Ionicons name="people" size={22} color={c.gold} />
            </View>
            <View style={styles.actionLabelCol}>
              <Text style={styles.actionLabelSecondary}>Waitlist</Text>
              <Text style={styles.actionSublabelSecondary}>
                {WAITLIST_ENTRIES.length === 0
                  ? 'No one waiting'
                  : `${WAITLIST_ENTRIES.length} waiting · ${waitAvg}m avg`}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Quiet links for less-used destinations */}
        <View style={styles.linkRow}>
          <Pressable
            onPress={() => router.push('/(staff)/floor' as never)}
            style={({ pressed }) => [styles.linkBtn, pressed && styles.actionPressed]}
            accessibilityRole="button"
            accessibilityLabel="Open floor plan"
          >
            <Ionicons name="grid-outline" size={18} color={c.gold} />
            <Text style={styles.linkLabel}>Floor</Text>
            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(staff)/analytics' as never)}
            style={({ pressed }) => [styles.linkBtn, pressed && styles.actionPressed]}
            accessibilityRole="button"
            accessibilityLabel="Open analytics"
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
