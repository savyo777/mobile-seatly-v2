import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Rect, Polyline, Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { resolveAuthDisplayProfile } from '@/lib/auth/displayProfile';
import { fetchCurrentUserProfile } from '@/lib/services/userProfile';
import { useOwnerScope } from '@/hooks/useOwnerScope';
import { RestaurantPicker } from '@/components/owner/RestaurantPicker';
import { safeOwnerPush } from '@/lib/navigation/safeOwnerNavigation';
import { withOwnerReturnTarget } from '@/lib/navigation/ownerReturnTargets';
import {
  BOOKING_TREND_WEEK as DEMO_BOOKING_TREND_WEEK,
  BOOKINGS_BY_HOUR as DEMO_BOOKINGS_BY_HOUR,
  BOOKINGS_BY_HOUR_PEAK as DEMO_BOOKINGS_BY_HOUR_PEAK,
  BOOKINGS_BY_HOUR_TOTAL as DEMO_BOOKINGS_BY_HOUR_TOTAL,
  LIVE_METRICS as DEMO_LIVE_METRICS,
  HOME_ATTENTION_ITEMS as DEMO_HOME_ATTENTION_ITEMS,
  OWNER_FLOOR_TABLES as DEMO_OWNER_FLOOR_TABLES,
  OWNER_RESERVATIONS as DEMO_OWNER_RESERVATIONS,
} from '@/lib/mock/ownerApp';
import { OWNER_GUESTS as DEMO_OWNER_GUESTS } from '@/lib/mock/guests';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { getSupabase } from '@/lib/supabase/client';
import { friendlyError } from '@/lib/errors/friendlyError';

const EMPTY_LIVE_METRICS: typeof DEMO_LIVE_METRICS = {
  tonightCovers: 0,
  openTables: 0,
  activeOrders: 0,
  noShowRisks: 0,
};
const EMPTY_BOOKING_TREND_WEEK: typeof DEMO_BOOKING_TREND_WEEK = {
  dayLabels: [],
  counts: [],
  vsPrevWeekPct: 0,
};
const OWNER_FLOOR_TABLES: typeof DEMO_OWNER_FLOOR_TABLES = isDemoModeEnabled() ? DEMO_OWNER_FLOOR_TABLES : [];
const OWNER_GUESTS: typeof DEMO_OWNER_GUESTS = isDemoModeEnabled() ? DEMO_OWNER_GUESTS : [];

const DAY_LABEL_FORMAT: Intl.DateTimeFormatOptions = { weekday: 'short' };

function formatHourLabel(hour: number): string {
  if (hour === 0) return '12a';
  if (hour === 12) return '12p';
  if (hour < 12) return `${hour}a`;
  return `${hour - 12}p`;
}

function classifyHourTier(count: number, peak: number): 'peak' | 'busy' | 'slow' {
  if (peak <= 0) return 'slow';
  const ratio = count / peak;
  if (ratio >= 0.8) return 'peak';
  if (ratio >= 0.35) return 'busy';
  return 'slow';
}

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
    width: 200,
    height: 73,
    marginLeft: -28,
    marginVertical: -18,
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

  upNextCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  upNextLeft: { flex: 1, minWidth: 0 },
  upNextKicker: {
    fontSize: 10,
    fontWeight: '700',
    color: c.gold,
    letterSpacing: 0.9,
    marginBottom: 3,
  },
  upNextName: {
    fontSize: 17,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 5,
  },
  upNextMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  upNextMetaText: {
    fontSize: 12,
    fontWeight: '500',
    color: c.textMuted,
  },
  upNextMetaDot: {
    fontSize: 12,
    color: c.textMuted,
  },
  upNextBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: `${c.success}20`,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${c.success}50`,
  },
  upNextBadgeRisk: {
    backgroundColor: `${c.danger}20`,
    borderColor: `${c.danger}50`,
  },
  upNextBadgePending: {
    backgroundColor: `${c.gold}18`,
    borderColor: `${c.gold}40`,
  },
  upNextBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.success,
  },
  upNextBadgeTextRisk: { color: c.danger },
  upNextBadgeTextPending: { color: c.gold },

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
    // 2 columns: each tile is just under half the available width so the
    // `gap` between columns fits without wrapping to a single column.
    width: '48.5%',
    aspectRatio: 1,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.md,
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

function BookingsByHourCard({
  bookingsByHour,
  peakLabel,
  totalBookings,
}: {
  bookingsByHour: typeof DEMO_BOOKINGS_BY_HOUR;
  peakLabel: string;
  totalBookings: number;
}) {
  const c = useColors();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const maxCount = Math.max(...bookingsByHour.map((b) => b.count), 1);

  const chartW = Math.max(220, width - spacing.lg * 4);
  const innerW = chartW - LINE_PAD.l - LINE_PAD.r;
  const innerH = LINE_CHART_H - LINE_PAD.t - LINE_PAD.b;
  const n = bookingsByHour.length;

  const pts = bookingsByHour.map((bar, i) => {
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
          <Text style={styles.hourTitle}>Peak at {peakLabel || '—'}</Text>
        </View>
        <View>
          <Text style={styles.hourTotalValue}>{totalBookings}</Text>
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
          {bookingsByHour.map((bar) => (
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
  const router = useRouter();
  const { user } = useAuthSession();
  const { selectedRestaurant, restaurantIds, isAll, restaurants } = useOwnerScope();
  const ownerRestaurant = selectedRestaurant;
  const [shiftBriefing, setShiftBriefing] = useState<string | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<typeof DEMO_LIVE_METRICS>(
    isDemoModeEnabled() ? DEMO_LIVE_METRICS : EMPTY_LIVE_METRICS,
  );
  const [bookingTrendWeek, setBookingTrendWeek] = useState<typeof DEMO_BOOKING_TREND_WEEK>(
    isDemoModeEnabled() ? DEMO_BOOKING_TREND_WEEK : EMPTY_BOOKING_TREND_WEEK,
  );
  const [bookingsByHour, setBookingsByHour] = useState<typeof DEMO_BOOKINGS_BY_HOUR>(
    isDemoModeEnabled() ? DEMO_BOOKINGS_BY_HOUR : [],
  );
  const [bookingsByHourPeak, setBookingsByHourPeak] = useState<string>(
    isDemoModeEnabled() ? DEMO_BOOKINGS_BY_HOUR_PEAK : '',
  );
  const [bookingsByHourTotal, setBookingsByHourTotal] = useState<number>(
    isDemoModeEnabled() ? DEMO_BOOKINGS_BY_HOUR_TOTAL : 0,
  );
  const [attentionItems, setAttentionItems] = useState<typeof DEMO_HOME_ATTENTION_ITEMS>(
    isDemoModeEnabled() ? DEMO_HOME_ATTENTION_ITEMS : [],
  );
  const [todayReservationCount, setTodayReservationCount] = useState<number>(0);
  const [todayCoversCount, setTodayCoversCount] = useState<number>(0);
  const [guestProfilesCount, setGuestProfilesCount] = useState<number>(0);
  const [ownerReservations, setOwnerReservations] = useState<typeof DEMO_OWNER_RESERVATIONS>(
    isDemoModeEnabled() ? DEMO_OWNER_RESERVATIONS : [],
  );
  const displayProfile = useMemo(() => resolveAuthDisplayProfile(user, { fullName: 'Owner' }), [user]);
  const [profileFullName, setProfileFullName] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    void fetchCurrentUserProfile()
      .then((profile) => {
        if (!active) return;
        if (profile?.fullName) setProfileFullName(profile.fullName);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Prefer user_profiles.full_name (where "Mark Habbi" lives) over the auth
  // metadata fallback, which is often empty for email-based signups.
  const greetingName = (profileFullName || displayProfile.fullName).trim();
  const firstName = greetingName.split(/\s+/).filter(Boolean)[0] || 'Owner';

  // Load shift briefing + restaurant_analytics + today's reservations once we know the restaurant id(s).
  const restaurantIdsKey = restaurantIds.join('|');
  useEffect(() => {
    if (isDemoModeEnabled()) return;
    if (restaurantIds.length === 0) return;
    const supabase = getSupabase();
    if (!supabase) return;
    let active = true;

    setLoadError(null);

    // Shift briefing text — only meaningful when scoped to a single restaurant.
    if (!isAll && restaurantIds.length === 1) {
      void supabase
        .from('restaurants')
        .select('current_shift_briefing')
        .eq('id', restaurantIds[0])
        .maybeSingle()
        .then(({ data, error }) => {
          if (!active) return;
          if (error) {
            setLoadError((prev) => prev ?? friendlyError(error, "Couldn't load today's metrics."));
            return;
          }
          const briefing = (data?.current_shift_briefing ?? null) as string | null;
          setShiftBriefing(briefing && briefing.trim() ? briefing : null);
        });
    } else {
      setShiftBriefing(null);
    }

    // Last 14 days of analytics — current 7 days for the week trend, previous 7 for the vs-last-week pct.
    const today = new Date();
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(today.getDate() - 13);
    const fromIso = fourteenDaysAgo.toISOString().slice(0, 10);
    const todayIso = today.toISOString().slice(0, 10);

    void supabase
      .from('restaurant_analytics')
      .select('date,total_covers,no_show_count,cancellation_count')
      .in('restaurant_id', restaurantIds)
      .gte('date', fromIso)
      .lte('date', todayIso)
      .order('date', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setLoadError((prev) => prev ?? friendlyError(error, "Couldn't load today's metrics."));
          return;
        }
        const rawRows = (data ?? []) as Array<{
          date: string;
          total_covers: number | null;
          no_show_count: number | null;
          cancellation_count: number | null;
        }>;

        // When scoped across multiple restaurants, sum the per-day counts so
        // the chart and aggregate metrics reflect every owned location.
        const aggregatedByDate = new Map<string, {
          date: string;
          total_covers: number;
          no_show_count: number;
          cancellation_count: number;
        }>();
        rawRows.forEach((row) => {
          const existing = aggregatedByDate.get(row.date);
          if (existing) {
            existing.total_covers += row.total_covers ?? 0;
            existing.no_show_count += row.no_show_count ?? 0;
            existing.cancellation_count += row.cancellation_count ?? 0;
          } else {
            aggregatedByDate.set(row.date, {
              date: row.date,
              total_covers: row.total_covers ?? 0,
              no_show_count: row.no_show_count ?? 0,
              cancellation_count: row.cancellation_count ?? 0,
            });
          }
        });
        const rows = Array.from(aggregatedByDate.values()).sort((a, b) =>
          a.date.localeCompare(b.date),
        );

        // Build last 7 days vs previous 7 days
        const byDate = new Map<string, (typeof rows)[number]>();
        rows.forEach((row) => byDate.set(row.date, row));

        const current: number[] = [];
        const previous: number[] = [];
        const dayLabels: string[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          const row = byDate.get(key);
          current.push(row?.total_covers ?? 0);
          dayLabels.push(d.toLocaleDateString('en-US', DAY_LABEL_FORMAT));
        }
        for (let i = 13; i >= 7; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          const row = byDate.get(key);
          previous.push(row?.total_covers ?? 0);
        }
        const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
        const currentTotal = sum(current);
        const prevTotal = sum(previous);
        const vsPrevWeekPct =
          prevTotal > 0 ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100) : 0;
        setBookingTrendWeek({ dayLabels, counts: current, vsPrevWeekPct });

        // Latest analytics row → tonightCovers + noShowRisks
        const latest = rows[rows.length - 1];
        setLiveMetrics((prev) => ({
          ...prev,
          tonightCovers: latest?.total_covers ?? 0,
          noShowRisks: latest?.no_show_count ?? 0,
        }));

        // Attention items derived from the latest analytics row
        const items: typeof DEMO_HOME_ATTENTION_ITEMS = [];
        if (latest && (latest.no_show_count ?? 0) > 0) {
          items.push({
            id: 'analytics-no-show',
            icon: 'warning',
            title: `${latest.no_show_count} no-show${latest.no_show_count === 1 ? '' : 's'} flagged today`,
            sub: 'Review at-risk reservations',
            severity: 'critical',
          });
        }
        if (latest && (latest.cancellation_count ?? 0) > 0) {
          items.push({
            id: 'analytics-cancellations',
            icon: 'time',
            title: `${latest.cancellation_count} cancellation${latest.cancellation_count === 1 ? '' : 's'} today`,
            sub: 'Backfill open slots',
            severity: 'warning',
          });
        }
        setAttentionItems(items);
      });

    // Today's reservations: count + per-hour breakdown
    const dayStart = new Date(today);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);

    void supabase
      .from('reservations')
      .select('reserved_at,status,party_size')
      .in('restaurant_id', restaurantIds)
      .gte('reserved_at', dayStart.toISOString())
      .lt('reserved_at', dayEnd.toISOString())
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setLoadError((prev) => prev ?? friendlyError(error, "Couldn't load today's metrics."));
          return;
        }
        const rows = (data ?? []) as Array<{ reserved_at: string; status: string | null; party_size: number | null }>;
        setTodayReservationCount(rows.length);
        const COUNTED = new Set(['pending', 'confirmed', 'seated', 'checked_in', 'completed']);
        const covers = rows.reduce((sum, r) => {
          if (r.status && !COUNTED.has(r.status)) return sum;
          return sum + (r.party_size ?? 0);
        }, 0);
        setTodayCoversCount(covers);

        // Aggregate by hour 16..23 (4 PM – 11 PM service window — same as the demo data)
        const HOURS = [16, 17, 18, 19, 20, 21, 22, 23];
        const counts = new Map<number, number>();
        HOURS.forEach((h) => counts.set(h, 0));
        rows.forEach((row) => {
          const d = new Date(row.reserved_at);
          const h = d.getHours();
          if (counts.has(h)) counts.set(h, (counts.get(h) ?? 0) + 1);
        });
        const peakCount = Math.max(...Array.from(counts.values()), 0);
        const peakHour = HOURS.find((h) => counts.get(h) === peakCount && peakCount > 0) ?? null;
        const byHour: typeof DEMO_BOOKINGS_BY_HOUR = HOURS.map((h) => ({
          label: formatHourLabel(h),
          count: counts.get(h) ?? 0,
          tier: classifyHourTier(counts.get(h) ?? 0, peakCount),
        }));
        setBookingsByHour(byHour);
        setBookingsByHourPeak(peakHour != null ? formatHourLabel(peakHour) : '');
        setBookingsByHourTotal(rows.length);
      });

    // Guest profile count for the Quick actions tile.
    void supabase
      .from('guests')
      .select('id', { count: 'exact', head: true })
      .in('restaurant_id', restaurantIds)
      .then(({ count, error }) => {
        if (!active) return;
        if (error) {
          setLoadError((prev) => prev ?? friendlyError(error, "Couldn't load today's metrics."));
          return;
        }
        setGuestProfilesCount(count ?? 0);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantIdsKey, isAll, reloadKey]);

  // Bump reloadKey whenever the Home tab regains focus so navigating away
  // and back re-pulls the latest reservations + analytics. Cheap relative
  // to the staleness of seeing yesterday's numbers after a tab switch.
  useFocusEffect(
    useCallback(() => {
      if (isDemoModeEnabled()) return;
      setReloadKey((k) => k + 1);
    }, []),
  );

  // Live realtime subscription. Any INSERT / UPDATE / DELETE on reservations
  // for the active restaurant scope bumps reloadKey so the Tonight + Hour
  // widgets reflect the change without a manual refresh.
  useEffect(() => {
    if (isDemoModeEnabled()) return;
    if (restaurantIds.length === 0) return;
    const supabase = getSupabase();
    if (!supabase) return;

    // Postgres filter syntax for realtime: only one filter per channel, so
    // for multi-restaurant scope ("all") subscribe without a filter and
    // post-filter in the handler. Single-restaurant case uses an eq filter
    // server-side, which is cheaper.
    const channelName = restaurantIds.length === 1
      ? `home-reservations-${restaurantIds[0]}`
      : 'home-reservations-all';
    const filter = restaurantIds.length === 1
      ? `restaurant_id=eq.${restaurantIds[0]}`
      : undefined;

    const ownedIds = new Set(restaurantIds);
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations', ...(filter ? { filter } : {}) },
        (payload) => {
          const row = (payload.new as { restaurant_id?: string } | null)
            ?? (payload.old as { restaurant_id?: string } | null)
            ?? null;
          const restaurantId = row?.restaurant_id;
          if (!restaurantId || ownedIds.has(restaurantId)) {
            setReloadKey((k) => k + 1);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [restaurantIdsKey, restaurantIds]);

  const seatedTables = OWNER_FLOOR_TABLES.filter((t) => t.status === 'occupied').length;
  const tablesTotal = OWNER_FLOOR_TABLES.length;
  const hour = new Date().getHours();
  const greeting = greetingFor(hour);
  const criticalCount = attentionItems.filter((a) => a.severity === 'critical').length;
  const bookingsTonight = isDemoModeEnabled() ? ownerReservations.length : todayReservationCount;
  const pendingCount = ownerReservations.filter((r) => r.status === 'pending').length;
  const upNext = ownerReservations.find((r) => r.status !== 'seated') ?? ownerReservations[0];
  const guestProfiles = isDemoModeEnabled() ? OWNER_GUESTS.length : guestProfilesCount;

  const quickActions: { icon: IoniconName; label: string; sub: string; route: string }[] = [
    { icon: 'calendar-outline', label: 'Reservations', sub: `${bookingsTonight} tonight`, route: '/(staff)/reservations' },
    { icon: 'pricetag-outline', label: 'Promos', sub: 'Active & past offers', route: '/(staff)/promotions' },
    {
      icon: 'id-card-outline',
      label: 'Guests',
      sub: `${guestProfiles} profiles · VIPs & notes`,
      route: '/(staff)/guests',
    },
    { icon: 'receipt-outline', label: 'Receipts', sub: 'Expenses & history', route: '/(staff)/expenses' },
  ];

  return (
    <View style={styles.root}>
      {/* ── Sticky brand bar — same treatment as diner Discover ── */}
      <View style={[styles.brandBar, { paddingTop: insets.top + spacing.xs }]}>
        <Image
          source={require('../../assets/cenaiva-logo.png')}
          style={styles.brandLogo}
          resizeMode="contain"
          accessibilityLabel={t('common.appName')}
        />
        <Pressable
          onPress={() =>
            safeOwnerPush(router, withOwnerReturnTarget('/(staff)/notifications', 'home') as never)
          }
          hitSlop={8}
          style={({ pressed }) => [styles.brandBellBtn, pressed && styles.brandBellPressed]}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={22} color={c.textPrimary} />
          {criticalCount > 0 ? <View style={styles.brandBellDot} /> : null}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={true}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
      >
        {loadError ? (
          <View style={{ marginHorizontal: spacing.md, marginTop: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: c.gold, backgroundColor: c.bgSurface, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Text style={{ color: c.textPrimary, fontSize: 13, flex: 1 }}>{loadError}</Text>
            <Pressable
              onPress={() => {
                setLoadError(null);
                setReloadKey((k) => k + 1);
              }}
              style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, borderWidth: 1, borderColor: c.gold }}
              accessibilityRole="button"
              accessibilityLabel="Retry loading today's metrics"
            >
              <Text style={{ color: c.gold, fontWeight: '600', fontSize: 13 }}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
        {/* ── Greeting block ── */}
        <View style={styles.topBar}>
          <View style={styles.tonightKicker}>
            <View style={styles.kickerDot} />
            <Text style={styles.kickerText}>TONIGHT · LIVE</Text>
          </View>
          <Text style={styles.greetLine1}>{greeting},</Text>
          <Text style={styles.greetLine2}>{firstName}.</Text>
          <Text style={styles.subline}>
            {isAll
              ? `All restaurants · ${restaurants.length} locations`
              : [ownerRestaurant?.name, ownerRestaurant?.address].filter(Boolean).join(' · ') ||
                'Restaurant dashboard'}
          </Text>
          <View style={{ marginTop: spacing.sm }}>
            <RestaurantPicker allowAll size="compact" />
          </View>
        </View>

        {/* ── Tonight hero ── */}
        <View style={styles.heroCard}>
          <Text style={styles.heroKicker}>TONIGHT</Text>
          <Text style={styles.heroTitle}>{bookingsTonight} reservations on deck</Text>
          {shiftBriefing ? (
            <Text style={styles.heroSub}>{shiftBriefing}</Text>
          ) : null}
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={[styles.statValue, styles.statValueGold]}>{bookingsTonight}</Text>
              <Text style={styles.statLabel}>Reservations</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.statValue}>{isDemoModeEnabled() ? liveMetrics.tonightCovers : todayCoversCount}</Text>
              <Text style={styles.statLabel}>Guests</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.statValue}>{seatedTables}/{bookingsTonight}</Text>
              <Text style={styles.statLabel}>Seated</Text>
            </View>
          </View>
        </View>

        {/* ── Up next ── */}
        {upNext && (
          <Pressable
            style={({ pressed }) => [styles.upNextCard, pressed && styles.rowPressed]}
            onPress={() => router.push('/(staff)/reservations' as never)}
            accessibilityRole="button"
          >
            <View style={styles.upNextLeft}>
              <Text style={styles.upNextKicker}>UP NEXT</Text>
              <Text style={styles.upNextName} numberOfLines={1}>
                {upNext.guestName}{upNext.vip ? ' ★' : ''}
              </Text>
              <View style={styles.upNextMeta}>
                <Ionicons name="time-outline" size={13} color={c.textMuted} />
                <Text style={styles.upNextMetaText}>{upNext.startTime}</Text>
                <Text style={styles.upNextMetaDot}>·</Text>
                <Ionicons name="people-outline" size={13} color={c.textMuted} />
                <Text style={styles.upNextMetaText}>Party of {upNext.partySize}</Text>
                {upNext.table ? (
                  <>
                    <Text style={styles.upNextMetaDot}>·</Text>
                    <Text style={styles.upNextMetaText}>{upNext.table}</Text>
                  </>
                ) : null}
              </View>
            </View>
            <View style={[
              styles.upNextBadge,
              upNext.status === 'risk' && styles.upNextBadgeRisk,
              upNext.status === 'pending' && styles.upNextBadgePending,
            ]}>
              <Text style={[
                styles.upNextBadgeText,
                upNext.status === 'risk' && styles.upNextBadgeTextRisk,
                upNext.status === 'pending' && styles.upNextBadgeTextPending,
              ]}>
                {upNext.status === 'risk' ? 'At risk' : upNext.status === 'pending' ? 'Pending' : 'Confirmed'}
              </Text>
            </View>
          </Pressable>
        )}

        {/* ── Bookings by hour ── */}
        <BookingsByHourCard
          bookingsByHour={bookingsByHour}
          peakLabel={bookingsByHourPeak}
          totalBookings={bookingsByHourTotal}
        />

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

        {/* ── Week momentum bar chart ── */}
        <WeekMomentumChart
          counts={bookingTrendWeek.counts}
          labels={bookingTrendWeek.dayLabels}
          trendPct={bookingTrendWeek.vsPrevWeekPct}
        />
      </ScrollView>
    </View>
  );
}
