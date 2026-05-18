import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { OwnerHeader } from '@/components/owner/OwnerHeader';
import { StatCard } from '@/components/owner/StatCard';
import { SectionCard } from '@/components/owner/SectionCard';
import {
  ANALYTICS_INSIGHTS,
  ANALYTICS_METRICS as DEMO_ANALYTICS_METRICS,
  BUSY_HEATMAP,
  REVENUE_DATA as DEMO_REVENUE_DATA,
  type RevenuePeriod,
} from '@/lib/mock/ownerApp';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { getSupabase } from '@/lib/supabase/client';
import { fetchCurrentUserProfile } from '@/lib/services/userProfile';
import { friendlyError } from '@/lib/errors/friendlyError';
import { useOwnerRestaurantContext } from '@/lib/owner/OwnerRestaurantContext';

const ZERO_METRIC = { revenue: 0, covers: 0, avgSpend: 0, noShowPct: 0, turnover: 0 };
const ZERO_REVENUE = { total: 0, trendPct: 0, series: [] as number[] };
const EMPTY_ANALYTICS_METRICS: typeof DEMO_ANALYTICS_METRICS = {
  day: ZERO_METRIC,
  week: ZERO_METRIC,
  '2w': ZERO_METRIC,
  month: ZERO_METRIC,
  '6m': ZERO_METRIC,
  year: ZERO_METRIC,
};
const EMPTY_REVENUE_DATA: typeof DEMO_REVENUE_DATA = {
  day: ZERO_REVENUE,
  week: ZERO_REVENUE,
  '2w': ZERO_REVENUE,
  month: ZERO_REVENUE,
  '6m': ZERO_REVENUE,
  year: ZERO_REVENUE,
};

type AnalyticsRow = {
  date: string;
  total_revenue: number;
  total_covers: number;
  avg_spend_per_cover: number;
  no_show_count: number;
};

function avgTurnover(rows: AnalyticsRow[]): number {
  if (rows.length === 0) return 0;
  // Not stored directly; approximate via covers/(orders) when present elsewhere.
  return 0;
}

function periodFromRange(range: PerfRange, today = new Date()): { from: string; to: string } {
  const to = new Date(today);
  const from = new Date(today);
  if (range === 'today') {
    // single day
  } else if (range === '7d') {
    from.setDate(today.getDate() - 6);
  } else if (range === '30d') {
    from.setDate(today.getDate() - 29);
  } else {
    // mtd
    from.setDate(1);
  }
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function reducePeriod(rows: AnalyticsRow[]) {
  const revenue = rows.reduce((s, r) => s + (Number(r.total_revenue) || 0), 0);
  const covers = rows.reduce((s, r) => s + (Number(r.total_covers) || 0), 0);
  const avgSpend = covers > 0 ? revenue / covers : 0;
  const totalNoShows = rows.reduce((s, r) => s + (Number(r.no_show_count) || 0), 0);
  const noShowPct = covers > 0 ? Math.round((totalNoShows / Math.max(1, covers + totalNoShows)) * 1000) / 10 : 0;
  return { revenue, covers, avgSpend, noShowPct, turnover: avgTurnover(rows) };
}

type PerfRange = 'today' | '7d' | '30d' | 'mtd';

const RANGE_MAP: Record<PerfRange, RevenuePeriod> = {
  today: 'day',
  '7d': 'week',
  '30d': 'month',
  mtd: 'month',
};

const ANALYTICS_METRICS_DEFAULT = isDemoModeEnabled()
  ? DEMO_ANALYTICS_METRICS
  : EMPTY_ANALYTICS_METRICS;
const REVENUE_DATA_DEFAULT = isDemoModeEnabled() ? DEMO_REVENUE_DATA : EMPTY_REVENUE_DATA;

const RANGES: { key: PerfRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: 'mtd', label: 'MTD' },
];

function barColor(series: number[], index: number, pos: string, neg: string): string {
  if (index === 0) return pos;
  return series[index] >= series[index - 1] ? pos : neg;
}

function heatRgb(p: number): string {
  const r = Math.round(34 + (239 - 34) * p);
  const g = Math.round(197 + (68 - 197) * p);
  const b = Math.round(94 + (68 - 94) * p);
  return `rgba(${r},${g},${b},0.88)`;
}

const useStyles = createStyles((c) => ({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  chipActive: {
    backgroundColor: c.gold,
    borderColor: c.gold,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textMuted,
  },
  chipTextActive: {
    color: c.bgBase,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  kpiHalf: {
    width: '48%',
    flexGrow: 1,
    maxWidth: '50%',
  },
  chartCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.xl,
  },
  chartLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.2,
    marginBottom: spacing.md,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 4,
  },
  barCol: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    borderRadius: borderRadius.md,
    backgroundColor: c.bgElevated,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: borderRadius.md,
    minHeight: 8,
  },
  heatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  heatCell: {
    width: '7.5%',
    minWidth: 22,
    height: 28,
    borderRadius: 6,
  },
  heatHint: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: spacing.md,
    fontWeight: '500',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  insightDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  insightTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.gold,
  },
  insightSub: {
    fontSize: 13,
    color: c.textMuted,
    fontWeight: '500',
    lineHeight: 18,
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 52,
    gap: spacing.md,
  },
  kvDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  kvLabel: {
    fontSize: 13,
    color: c.textMuted,
    fontWeight: '500',
    flex: 1,
  },
  kvValue: {
    fontSize: 14,
    fontWeight: '700',
    color: c.textPrimary,
  },
  kvValueGold: {
    color: c.gold,
  },
}));

type KVRowItem = {
  label: string;
  value: string;
  accent?: boolean;
};

export default function OwnerAnalyticsScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const [range, setRange] = useState<PerfRange>('7d');
  const [analyticsMetrics, setAnalyticsMetrics] = useState(ANALYTICS_METRICS_DEFAULT);
  const [revenueData, setRevenueData] = useState(REVENUE_DATA_DEFAULT);
  const { restaurants, selectedRestaurantId, isAll } = useOwnerRestaurantContext();
  const headerSubtitle = isAll
    ? undefined
    : restaurants.find((r) => r.id === selectedRestaurantId)?.name;

  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (isDemoModeEnabled()) return;
    let active = true;
    setLoadError(null);
    void (async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) return;
        const profile = await fetchCurrentUserProfile();
        const restaurantId = profile?.restaurantId;
        if (!restaurantId) return;

        const today = new Date();
        const longFrom = new Date(today);
        longFrom.setDate(today.getDate() - 365);

        const { data } = await supabase
          .from('restaurant_analytics')
          .select('date,total_revenue,total_covers,avg_spend_per_cover,no_show_count')
          .eq('restaurant_id', restaurantId)
          .gte('date', longFrom.toISOString().slice(0, 10))
          .order('date', { ascending: true });
        if (!active) return;
        const rows = ((data ?? []) as AnalyticsRow[]).map((r) => ({
          date: String(r.date),
          total_revenue: Number(r.total_revenue) || 0,
          total_covers: Number(r.total_covers) || 0,
          avg_spend_per_cover: Number(r.avg_spend_per_cover) || 0,
          no_show_count: Number(r.no_show_count) || 0,
        }));

        const buildRange = (rangeKey: PerfRange) => {
          const { from, to } = periodFromRange(rangeKey, today);
          return rows.filter((r) => r.date >= from && r.date <= to);
        };
        const todayRows = buildRange('today');
        const weekRows = buildRange('7d');
        const monthRows = buildRange('30d');
        const yearRows = rows; // up to 365 days

        const nextMetrics = {
          day: reducePeriod(todayRows),
          week: reducePeriod(weekRows),
          '2w': reducePeriod(rows.slice(-14)),
          month: reducePeriod(monthRows),
          '6m': reducePeriod(rows.slice(-180)),
          year: reducePeriod(yearRows),
        };
        setAnalyticsMetrics(nextMetrics);

        const seriesFor = (slice: AnalyticsRow[]) => slice.map((r) => Number(r.total_revenue) || 0);
        const totalFor = (slice: AnalyticsRow[]) =>
          slice.reduce((s, r) => s + (Number(r.total_revenue) || 0), 0);
        const trendFor = (curr: AnalyticsRow[], prev: AnalyticsRow[]) => {
          const a = totalFor(curr);
          const b = totalFor(prev);
          if (b <= 0) return 0;
          return Math.round(((a - b) / b) * 1000) / 10;
        };

        const last7 = rows.slice(-7);
        const prev7 = rows.slice(-14, -7);
        const last30 = rows.slice(-30);
        const prev30 = rows.slice(-60, -30);
        const last1 = rows.slice(-1);
        const prev1 = rows.slice(-2, -1);

        setRevenueData({
          day: { total: totalFor(last1), trendPct: trendFor(last1, prev1), series: seriesFor(last1) },
          week: { total: totalFor(last7), trendPct: trendFor(last7, prev7), series: seriesFor(last7) },
          '2w': {
            total: totalFor(rows.slice(-14)),
            trendPct: trendFor(rows.slice(-14), rows.slice(-28, -14)),
            series: seriesFor(rows.slice(-14)),
          },
          month: { total: totalFor(last30), trendPct: trendFor(last30, prev30), series: seriesFor(last30) },
          '6m': {
            total: totalFor(rows.slice(-180)),
            trendPct: trendFor(rows.slice(-180), rows.slice(-360, -180)),
            series: seriesFor(rows.slice(-180)),
          },
          year: {
            total: totalFor(yearRows),
            trendPct: 0,
            series: seriesFor(yearRows),
          },
        });
      } catch (err) {
        if (!active) return;
        setLoadError(friendlyError(err, "Couldn't load analytics."));
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const period = RANGE_MAP[range];
  const m = analyticsMetrics[period];
  const series = revenueData[period].series;
  const maxBar = Math.max(...series, 1);

  const heatColors = useMemo(() => {
    const max = Math.max(...BUSY_HEATMAP, 1);
    return BUSY_HEATMAP.map((v) => v / max);
  }, []);

  const insights = useMemo(
    () => [
      {
        key: 'peak',
        icon: 'trending-up-outline' as const,
        title: t('owner.insightPeak'),
        body: ANALYTICS_INSIGHTS.peakHours,
      },
      {
        key: 'dead',
        icon: 'moon-outline' as const,
        title: t('owner.insightDead'),
        body: ANALYTICS_INSIGHTS.deadHours,
      },
      {
        key: 'best',
        icon: 'calendar-outline' as const,
        title: t('owner.insightBestDays'),
        body: ANALYTICS_INSIGHTS.bestDays,
      },
    ],
    [t],
  );

  return (
    <OwnerScreen contentContainerStyle={{ paddingHorizontal: 0 }}>
      <OwnerHeader title={t('owner.analyticsTitle')} subtitle={headerSubtitle} />
      {loadError ? (
        <View style={{ marginHorizontal: spacing.md, marginVertical: spacing.sm, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: c.gold, backgroundColor: c.bgSurface, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Text style={{ color: c.textPrimary, fontSize: 13, flex: 1 }}>{loadError}</Text>
          <Pressable
            onPress={() => {
              setLoadError(null);
              setReloadKey((k) => k + 1);
            }}
            style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, borderWidth: 1, borderColor: c.gold }}
            accessibilityRole="button"
            accessibilityLabel="Retry loading analytics"
          >
            <Text style={{ color: c.gold, fontWeight: '600', fontSize: 13 }}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.chipRow}>
        {RANGES.map((r) => (
          <Pressable
            key={r.key}
            onPress={() => setRange(r.key)}
            style={[styles.chip, range === r.key && styles.chipActive]}
          >
            <Text style={[styles.chipText, range === r.key && styles.chipTextActive]}>{r.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.kpiGrid}>
        <StatCard
          style={styles.kpiHalf}
          label={t('owner.metricRevenue')}
          accentValue
          value={formatCurrency(m.revenue, 'cad')}
        />
        <StatCard style={styles.kpiHalf} label={t('owner.metricCovers')} value={String(m.covers)} />
        <StatCard
          style={styles.kpiHalf}
          label={t('owner.metricAvgSpend')}
          value={formatCurrency(m.avgSpend, 'cad')}
        />
        <StatCard style={styles.kpiHalf} label={t('owner.metricNoShow')} value={`${m.noShowPct}%`} />
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartLabel}>{t('owner.chartDaily')}</Text>
        <View style={styles.barRow}>
          {series.map((v, i) => {
            const h = Math.max(8, Math.round((v / maxBar) * 120));
            return (
              <View key={i} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: h,
                        backgroundColor: barColor(series, i, c.success, c.danger),
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <SectionCard sectionTitle={t('owner.chartHeat')} marginBottom={spacing.lg}>
        <View style={{ padding: spacing.md }}>
          <View style={styles.heatRow}>
            {heatColors.map((p, h) => (
              <View key={h} style={[styles.heatCell, { backgroundColor: heatRgb(p) }]} />
            ))}
          </View>
          <Text style={styles.heatHint}>{t('owner.chartHeatHint')}</Text>
        </View>
      </SectionCard>

      {isDemoModeEnabled() ? (
        <>
          {/* Revenue / guest-mix / top-dishes / booking-sources are
              fabricated breakdowns of `m.revenue` and `m.covers`. They're
              shown in demo mode only to give a feel for the dashboard;
              real owners will see them once analytics aggregations exist
              on the backend. */}
          <SectionCard sectionTitle="Revenue breakdown">
            {(
              [
                { label: 'Food', value: formatCurrency(m.revenue * 0.62, 'cad') },
                { label: 'Drinks', value: formatCurrency(m.revenue * 0.32, 'cad') },
                { label: 'Tips', value: formatCurrency(m.revenue * 0.12, 'cad') },
                { label: 'Discounts given', value: `- ${formatCurrency(m.revenue * 0.03, 'cad')}` },
                { label: 'Deposits', value: formatCurrency(m.revenue * 0.04, 'cad') },
                { label: 'Gift cards sold', value: formatCurrency(m.revenue * 0.02, 'cad') },
                { label: 'Event revenue', value: formatCurrency(m.revenue * 0.06, 'cad') },
                { label: 'Promo uses', value: `${Math.round(m.covers * 0.08)}` },
              ] as KVRowItem[]
            ).map((row, i) => (
              <View key={row.label} style={[styles.kvRow, i > 0 && styles.kvDivider]}>
                <Text style={styles.kvLabel}>{row.label}</Text>
                <Text style={[styles.kvValue, row.accent && styles.kvValueGold]}>{row.value}</Text>
              </View>
            ))}
          </SectionCard>

          <SectionCard sectionTitle="Guest mix">
            {(
              [
                { label: 'New guests', value: String(Math.round(m.covers * 0.28)) },
                { label: 'Returning guests', value: String(Math.round(m.covers * 0.72)) },
                { label: 'VIP covers', value: String(Math.round(m.covers * 0.12)) },
                { label: 'Walk-ins', value: String(Math.round(m.covers * 0.18)) },
                { label: 'Preorders', value: String(Math.round(m.covers * 0.22)) },
              ] as KVRowItem[]
            ).map((row, i) => (
              <View key={row.label} style={[styles.kvRow, i > 0 && styles.kvDivider]}>
                <Text style={styles.kvLabel}>{row.label}</Text>
                <Text style={styles.kvValue}>{row.value}</Text>
              </View>
            ))}
          </SectionCard>

          <SectionCard sectionTitle="Operations">
            {(
              [
                { label: 'Avg table turn', value: '78 min' },
                { label: 'Labour cost', value: formatCurrency(m.revenue * 0.24, 'cad') },
                { label: 'Turnover', value: `${m.turnover}x` },
              ] as KVRowItem[]
            ).map((row, i) => (
              <View key={row.label} style={[styles.kvRow, i > 0 && styles.kvDivider]}>
                <Text style={styles.kvLabel}>{row.label}</Text>
                <Text style={styles.kvValue}>{row.value}</Text>
              </View>
            ))}
          </SectionCard>

          <SectionCard sectionTitle="Top dishes">
            {[
              { name: 'Tagliatelle al ragù', count: 82, revenue: 2214 },
              { name: 'Branzino', count: 61, revenue: 2684 },
              { name: 'Burrata', count: 54, revenue: 864 },
              { name: 'Negroni', count: 48, revenue: 672 },
            ].map((d, i) => (
              <View key={d.name} style={[styles.kvRow, i > 0 && styles.kvDivider]}>
                <Text style={styles.kvLabel}>
                  {d.name} · {d.count}
                </Text>
                <Text style={styles.kvValue}>{formatCurrency(d.revenue, 'cad')}</Text>
              </View>
            ))}
          </SectionCard>

          <SectionCard sectionTitle="Booking sources">
            {[
              { label: 'App', pct: 48 },
              { label: 'Web', pct: 24 },
              { label: 'Phone', pct: 16 },
              { label: 'Walk-in', pct: 12 },
            ].map((s, i) => (
              <View key={s.label} style={[styles.kvRow, i > 0 && styles.kvDivider]}>
                <Text style={styles.kvLabel}>{s.label}</Text>
                <Text style={styles.kvValue}>{s.pct}%</Text>
              </View>
            ))}
          </SectionCard>
        </>
      ) : null}

      <SectionCard sectionTitle={t('owner.analyticsInsightsTitle')} marginBottom={spacing['2xl']}>
        {insights.map((row, i) => (
          <View key={row.key} style={[styles.insightRow, i > 0 && styles.insightDivider]}>
            <Ionicons name={row.icon} size={22} color={c.textMuted} />
            <View style={styles.insightTextWrap}>
              <Text style={styles.insightTitle}>{row.title}</Text>
              <Text style={styles.insightSub}>{row.body}</Text>
            </View>
          </View>
        ))}
      </SectionCard>
    </OwnerScreen>
  );
}
