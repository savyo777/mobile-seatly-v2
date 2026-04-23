import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Rect, Polyline, Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useColors, createStyles, spacing, borderRadius, typography } from '@/lib/theme';
import {
  BOOKING_TREND_WEEK,
  BOOKINGS_BY_HOUR,
  BOOKINGS_BY_HOUR_PEAK,
  BOOKINGS_BY_HOUR_TOTAL,
  LIVE_METRICS,
  HOME_ATTENTION_ITEMS,
  OWNER_FLOOR_TABLES,
  OWNER_FIRST_NAME,
  OWNER_RESERVATIONS,
} from '@/lib/mock/ownerApp';
import { OWNER_GUESTS } from '@/lib/mock/guests';
import { useOwnerTabScrollPadding } from '@/hooks/useOwnerTabScrollPadding';

const RESTAURANT_NAME = 'Nova Ristorante';
const RESTAURANT_ADDRESS = '412 King St W';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function greetingFor(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Good night';
}

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  hourChartCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.lg,
  },
  hourChartTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  hourKicker: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.9,
    marginBottom: 4,
  },
  hourTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.5,
  },
  hourTotalValue: {
    fontSize: 36,
    fontWeight: '800',
    color: c.gold,
    letterSpacing: -1,
    lineHeight: 40,
    textAlign: 'right',
  },
  hourTotalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },
  hourLineChartBlock: {
    marginBottom: spacing.md,
  },
  hourAxisRow: {
    flexDirection: 'row',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  hourAxisLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: c.textMuted,
    textAlign: 'center',
  },
  hourAxisLabelPeak: { color: c.gold },
  hourLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  hourLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  hourLegendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  hourLegendText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textMuted,
  },

  /** Matches diner `discover/index.tsx` sticky header brand row */
  brandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: c.bgBase,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  brandLogo: {
    ...typography.h2,
    color: c.gold,
    letterSpacing: 4,
    fontWeight: '700',
  },
  brandBellBtn: {
    padding: 4,
  },
  brandBellPressed: { opacity: 0.7 },
  brandBellDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.danger,
  },

  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  tonightKicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  kickerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: c.success,
  },
  kickerText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.8,
  },
  greetLine1: {
    fontSize: 32,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  greetLine2: {
    fontSize: 32,
    fontWeight: '800',
    color: c.gold,
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  subline: {
    fontSize: 13,
    color: c.textMuted,
    fontWeight: '500',
    marginTop: 6,
  },

  heroCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.lg,
  },
  heroKicker: {
    fontSize: 11,
    fontWeight: '700',
    color: c.gold,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.6,
    lineHeight: 30,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 14,
    color: c.textMuted,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  heroStats: {
    flexDirection: 'row',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  heroStat: { flex: 1, minWidth: 0 },
  heroStatDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginHorizontal: spacing.md,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  statValueGold: { color: c.gold },
  statLabel: {
    fontSize: 11,
    color: c.textMuted,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.1,
  },

  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.4,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: { fontSize: 13, fontWeight: '700', color: c.gold },

  attentionCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
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
    paddingVertical: 14,
    gap: spacing.md,
    minHeight: 66,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  rowPressed: { backgroundColor: c.bgElevated },
  attentionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  attentionTextCol: { flex: 1, minWidth: 0 },
  attentionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
    lineHeight: 20,
  },
  attentionSub: {
    fontSize: 13,
    color: c.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },

  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  actionTile: {
    width: '47.5%',
    flexGrow: 1,
    minWidth: '45%',
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.md,
    paddingBottom: 18,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  actionTilePressed: { backgroundColor: c.bgElevated },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  actionIconWrapPrimary: { backgroundColor: `${c.gold}18` },
  actionLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.2,
  },
  actionSub: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: '500',
    marginTop: 3,
  },

  momentumCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  momentumTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  momentumKicker: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.9,
    marginBottom: 4,
  },
  momentumHeadline: {
    fontSize: 32,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  vsChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: `${c.success}22`,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${c.success}55`,
    marginTop: 6,
  },
  vsChipNeg: {
    backgroundColor: `${c.danger}22`,
    borderColor: `${c.danger}55`,
  },
  vsChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.success,
    letterSpacing: 0.1,
  },
  vsChipTextNeg: { color: c.danger },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  barCol: { flex: 1, alignItems: 'center' },
  barLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: c.textMuted,
    marginTop: 5,
    textAlign: 'center',
  },
}));

function attentionIconTone(severity: string, c: ReturnType<typeof useColors>) {
  if (severity === 'critical') return { bg: `${c.danger}20`, fg: c.danger };
  if (severity === 'warning') return { bg: `${c.gold}1A`, fg: c.gold };
  return { bg: `${c.success}18`, fg: c.success };
}

function hourTierStroke(tier: string, gold: string) {
  if (tier === 'peak') return gold;
  if (tier === 'busy') return `${gold}CC`;
  return '#5C5C5C';
}

const LINE_CHART_H = 112;
const LINE_PAD = { l: 10, r: 10, t: 14, b: 6 };

function BookingsByHourCard() {
  const c = useColors();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const maxCount = Math.max(...BOOKINGS_BY_HOUR.map((b) => b.count), 1);

  const chartW = Math.max(220, width - spacing.lg * 4);
  const innerW = chartW - LINE_PAD.l - LINE_PAD.r;
  const innerH = LINE_CHART_H - LINE_PAD.t - LINE_PAD.b;
  const n = BOOKINGS_BY_HOUR.length;

  const pts = BOOKINGS_BY_HOUR.map((bar, i) => {
    const x = LINE_PAD.l + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = LINE_PAD.t + innerH - (bar.count / maxCount) * innerH;
    return { x, y, ...bar };
  });

  const linePoints = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const baseY = LINE_PAD.t + innerH;
  const areaD =
    pts.length > 0
      ? `M ${pts[0].x} ${baseY} ${pts.map((p) => `L ${p.x} ${p.y}`).join(' ')} L ${pts[pts.length - 1].x} ${baseY} Z`
      : '';

  return (
    <View style={styles.hourChartCard}>
      <View style={styles.hourChartTop}>
        <View>
          <Text style={styles.hourKicker}>BOOKINGS BY HOUR</Text>
          <Text style={styles.hourTitle}>Peak at {BOOKINGS_BY_HOUR_PEAK}</Text>
        </View>
        <View>
          <Text style={styles.hourTotalValue}>{BOOKINGS_BY_HOUR_TOTAL}</Text>
          <Text style={styles.hourTotalLabel}>bookings</Text>
        </View>
      </View>

      <View style={styles.hourLineChartBlock}>
        <Svg width={chartW} height={LINE_CHART_H}>
          <Defs>
            <LinearGradient id="hourLineArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c.gold} stopOpacity="0.22" />
              <Stop offset="1" stopColor={c.gold} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          {areaD ? <Path d={areaD} fill="url(#hourLineArea)" /> : null}
          <Polyline
            points={linePoints}
            fill="none"
            stroke={c.gold}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {pts.map((p) => (
            <Circle
              key={p.label}
              cx={p.x}
              cy={p.y}
              r={5}
              fill={c.bgSurface}
              stroke={hourTierStroke(p.tier, c.gold)}
              strokeWidth={2}
            />
          ))}
        </Svg>
        <View style={styles.hourAxisRow}>
          {BOOKINGS_BY_HOUR.map((bar) => (
            <Text
              key={bar.label}
              style={[styles.hourAxisLabel, bar.tier === 'peak' && styles.hourAxisLabelPeak]}
              numberOfLines={1}
            >
              {bar.label}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.hourLegend}>
        {[
          { label: 'Peak', color: c.gold },
          { label: 'Busy', color: `${c.gold}CC` },
          { label: 'Slow — promo?', color: '#5C5C5C' },
        ].map((l) => (
          <View key={l.label} style={styles.hourLegendItem}>
            <View style={[styles.hourLegendDot, { backgroundColor: l.color }]} />
            <Text style={styles.hourLegendText}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function WeekMomentumChart({ counts, labels, trendPct }: { counts: number[]; labels: string[]; trendPct: number }) {
  const c = useColors();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const chartW = width - spacing.lg * 2 - spacing.lg * 2;
  const BAR_H = 80;
  const max = Math.max(...counts, 1);
  const trendUp = trendPct >= 0;

  return (
    <View style={styles.momentumCard}>
      <View style={styles.momentumTop}>
        <View>
          <Text style={styles.momentumKicker}>WEEK MOMENTUM</Text>
          <Text style={styles.momentumHeadline}>
            {trendUp ? '+' : ''}{trendPct}% bookings
          </Text>
        </View>
        <View style={[styles.vsChip, !trendUp && styles.vsChipNeg]}>
          <Text style={[styles.vsChipText, !trendUp && styles.vsChipTextNeg]}>vs last week</Text>
        </View>
      </View>
      <View style={[styles.chartRow, { height: BAR_H + 22 }]}>
        {counts.map((count, i) => {
          const barH = Math.max(4, (count / max) * BAR_H);
          const isPast = i < counts.length - 3;
          return (
            <View key={labels[i]} style={[styles.barCol, { justifyContent: 'flex-end', height: BAR_H + 22 }]}>
              <Svg width="100%" height={barH} viewBox={`0 0 30 ${barH}`}>
                <Rect
                  x={0}
                  y={0}
                  width={30}
                  height={barH}
                  rx={6}
                  fill={isPast ? `${c.gold}40` : c.gold}
                />
              </Svg>
              <Text style={styles.barLabel}>{labels[i][0]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function OwnerHomeScreen() {
  const c = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const scrollPad = useOwnerTabScrollPadding();
  const router = useRouter();

  const seatedTables = OWNER_FLOOR_TABLES.filter((t) => t.status === 'occupied').length;
  const tablesTotal = OWNER_FLOOR_TABLES.length;
  const hour = new Date().getHours();
  const greeting = greetingFor(hour);
  const criticalCount = HOME_ATTENTION_ITEMS.filter((a) => a.severity === 'critical').length;
  const bookingsTonight = OWNER_RESERVATIONS.length;
  const pendingCount = OWNER_RESERVATIONS.filter((r) => r.status === 'pending').length;
  const onShiftCount = 3;
  const guestProfiles = OWNER_GUESTS.length;

  const quickActions: { icon: IoniconName; label: string; sub: string; route: string }[] = [
    { icon: 'calendar-outline', label: 'Reservations', sub: `${bookingsTonight} tonight`, route: '/(staff)/reservations' },
    { icon: 'pricetag-outline', label: 'Post promo', sub: 'Fill slow slots', route: '/(staff)/promotions/new' },
    {
      icon: 'id-card-outline',
      label: 'Guests',
      sub: `${guestProfiles} profiles · VIPs & notes`,
      route: '/(staff)/guests',
    },
    { icon: 'people-outline', label: 'Staff', sub: `${onShiftCount} on tonight`, route: '/(staff)/staff' },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + spacing.xs, paddingBottom: scrollPad }}
      >
        {/* ── Brand bar — same treatment as diner Discover ── */}
        <View style={styles.brandBar}>
          <Text style={styles.brandLogo}>{t('common.appName')}</Text>
          <Pressable
            onPress={() => router.push('/(staff)/notifications' as never)}
            hitSlop={8}
            style={({ pressed }) => [styles.brandBellBtn, pressed && styles.brandBellPressed]}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={22} color={c.textPrimary} />
            {criticalCount > 0 ? <View style={styles.brandBellDot} /> : null}
          </Pressable>
        </View>

        {/* ── Greeting block ── */}
        <View style={styles.topBar}>
          <View style={styles.tonightKicker}>
            <View style={styles.kickerDot} />
            <Text style={styles.kickerText}>TONIGHT · LIVE</Text>
          </View>
          <Text style={styles.greetLine1}>{greeting},</Text>
          <Text style={styles.greetLine2}>{OWNER_FIRST_NAME}.</Text>
          <Text style={styles.subline}>{RESTAURANT_NAME} · {RESTAURANT_ADDRESS}</Text>
        </View>

        {/* ── Bookings by hour ── */}
        <BookingsByHourCard />

        {/* ── Tonight hero ── */}
        <View style={styles.heroCard}>
          <Text style={styles.heroKicker}>TONIGHT</Text>
          <Text style={styles.heroTitle}>{bookingsTonight} reservations on deck</Text>
          <Text style={styles.heroSub}>
            {LIVE_METRICS.tonightCovers} covers booked. {pendingCount} need confirmation.
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={[styles.statValue, styles.statValueGold]}>{bookingsTonight}</Text>
              <Text style={styles.statLabel}>Reservations</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.statValue}>{LIVE_METRICS.tonightCovers}</Text>
              <Text style={styles.statLabel}>Covers</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.statValue}>{seatedTables}/{tablesTotal}</Text>
              <Text style={styles.statLabel}>Seated</Text>
            </View>
          </View>
        </View>

        {/* ── Quick actions ── */}
        <View style={styles.sectionRow}>
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
              <View style={[styles.actionIconWrap, styles.actionIconWrapPrimary]}>
                <Ionicons name={action.icon} size={20} color={c.gold} />
              </View>
              <View>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Text style={styles.actionSub}>{action.sub}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* ── Needs attention ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Needs attention</Text>
          <Pressable
            onPress={() => router.push('/(staff)/notifications' as never)}
            style={styles.seeAll}
            hitSlop={8}
          >
            <Text style={styles.seeAllText}>See all</Text>
            <Ionicons name="chevron-forward" size={14} color={c.gold} />
          </Pressable>
        </View>
        <View style={styles.attentionCard}>
          {HOME_ATTENTION_ITEMS.map((item, index) => {
            const tone = attentionIconTone(item.severity, c);
            const iconName: IoniconName =
              item.severity === 'critical' ? 'warning-outline' :
              item.severity === 'warning' ? 'time-outline' : 'sparkles-outline';
            return (
              <Pressable
                key={item.id}
                onPress={() => router.push('/(staff)/notifications' as never)}
                style={({ pressed }) => [styles.attentionRow, index > 0 && styles.rowDivider, pressed && styles.rowPressed]}
                accessibilityRole="button"
              >
                <View style={[styles.attentionIcon, { backgroundColor: tone.bg }]}>
                  <Ionicons name={iconName} size={18} color={tone.fg} />
                </View>
                <View style={styles.attentionTextCol}>
                  <Text style={styles.attentionTitle}>{item.title}</Text>
                  <Text style={styles.attentionSub}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
              </Pressable>
            );
          })}
        </View>

        {/* ── Week momentum bar chart ── */}
        <WeekMomentumChart
          counts={BOOKING_TREND_WEEK.counts}
          labels={BOOKING_TREND_WEEK.dayLabels}
          trendPct={BOOKING_TREND_WEEK.vsPrevWeekPct}
        />
      </ScrollView>
    </View>
  );
}
