import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import {
  ANALYTICS_METRICS as DEMO_ANALYTICS_METRICS,
  ANALYTICS_INSIGHTS as DEMO_ANALYTICS_INSIGHTS,
  CRM_SPOTLIGHT as DEMO_CRM_SPOTLIGHT,
  AI_INSIGHTS_HOME as DEMO_AI_INSIGHTS_HOME,
  REVENUE_DATA as DEMO_REVENUE_DATA,
  type CrmGuest,
  type RevenuePeriod,
} from '@/lib/mock/ownerApp';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { getSupabase } from '@/lib/supabase/client';
import { fetchCurrentUserProfile } from '@/lib/services/userProfile';

const ZERO_METRIC = { revenue: 0, covers: 0, avgSpend: 0, noShowPct: 0, turnover: 0 };
const ZERO_REVENUE = { total: 0, trendPct: 0, series: [] };
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
const EMPTY_ANALYTICS_INSIGHTS: typeof DEMO_ANALYTICS_INSIGHTS = {
  peakHours: '',
  deadHours: '',
  bestDays: '',
};
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { friendlyError } from '@/lib/errors/friendlyError';

const PERIODS: { key: RevenuePeriod; label: string }[] = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  topBar: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  topSubline: { fontSize: 13, fontWeight: '500', color: c.textMuted, marginBottom: 2 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.5,
  },

  sectionPad: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },

  periodRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.md },
  periodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  periodChipActive: { backgroundColor: c.gold, borderColor: c.gold },
  periodChipText: { fontSize: 12, fontWeight: '600', color: c.textMuted },
  periodChipTextActive: { color: c.bgBase },

  // Metric tiles
  tilesRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tile: {
    flex: 1,
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.md,
    gap: 4,
  },
  tileVal: {
    fontSize: 18,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.5,
  },
  tileLabel: { fontSize: 10, fontWeight: '600', color: c.textMuted, letterSpacing: 0.3 },

  // Revenue card
  revenueCard: {
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  revenueNum: {
    fontSize: 34,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -1,
    marginTop: 6,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
    marginBottom: spacing.lg,
  },
  trendUp: { fontSize: 13, fontWeight: '700', color: '#22C55E' },
  trendDown: { fontSize: 13, fontWeight: '700', color: '#EF4444' },
  trendVs: { fontSize: 13, color: c.textMuted },

  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 56, gap: 4 },
  barWrap: { flex: 1, height: 56, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4, minHeight: 4 },

  // Highlights
  highlightCard: {
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  highlightDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  highlightText: { flex: 1, fontSize: 13, fontWeight: '500', color: c.textPrimary },

  // CRM spotlight
  crmCard: {
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  crmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  crmDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  crmAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  crmInitials: { fontSize: 13, fontWeight: '800', color: c.gold },
  crmInfo: { flex: 1 },
  crmName: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
  crmSub: { fontSize: 12, color: c.textMuted, marginTop: 1 },
  crmSpend: { fontSize: 13, fontWeight: '700', color: c.textPrimary },

  // AI insight
  aiCard: {
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  aiLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textMuted,
    marginBottom: spacing.sm,
  },
  aiText: { fontSize: 15, fontWeight: '600', color: c.textPrimary, lineHeight: 22 },
}));

function barColor(series: number[], i: number): string {
  if (i === 0) return '#22C55E';
  return series[i] >= series[i - 1] ? '#22C55E' : '#EF4444';
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

export default function OwnerInsightsScreen() {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<RevenuePeriod>('day');
  const [analyticsMetrics, setAnalyticsMetrics] = useState<typeof DEMO_ANALYTICS_METRICS>(
    isDemoModeEnabled() ? DEMO_ANALYTICS_METRICS : EMPTY_ANALYTICS_METRICS,
  );
  const [analyticsInsights, setAnalyticsInsights] = useState<typeof DEMO_ANALYTICS_INSIGHTS>(
    isDemoModeEnabled() ? DEMO_ANALYTICS_INSIGHTS : EMPTY_ANALYTICS_INSIGHTS,
  );
  const [revenueData, setRevenueData] = useState<typeof DEMO_REVENUE_DATA>(
    isDemoModeEnabled() ? DEMO_REVENUE_DATA : EMPTY_REVENUE_DATA,
  );
  const [crmSpotlight, setCrmSpotlight] = useState<CrmGuest[]>(
    isDemoModeEnabled() ? DEMO_CRM_SPOTLIGHT : [],
  );
  const [aiInsightsHome, setAiInsightsHome] = useState<typeof DEMO_AI_INSIGHTS_HOME>(
    isDemoModeEnabled() ? DEMO_AI_INSIGHTS_HOME : [],
  );
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
        const from = new Date(today);
        from.setDate(today.getDate() - 365);

        const { data: analyticsRows } = await supabase
          .from('restaurant_analytics')
          .select('date,total_revenue,total_covers,avg_spend_per_cover,no_show_count')
          .eq('restaurant_id', restaurantId)
          .gte('date', from.toISOString().slice(0, 10))
          .order('date', { ascending: true });
        if (!active) return;

        const rows = ((analyticsRows ?? []) as Array<Record<string, unknown>>).map((r) => ({
          date: String(r.date),
          revenue: Number(r.total_revenue) || 0,
          covers: Number(r.total_covers) || 0,
          avgSpend: Number(r.avg_spend_per_cover) || 0,
          noShows: Number(r.no_show_count) || 0,
        }));

        const reduce = (slice: typeof rows) => {
          const revenue = slice.reduce((s, r) => s + r.revenue, 0);
          const covers = slice.reduce((s, r) => s + r.covers, 0);
          const avgSpend = covers > 0 ? revenue / covers : 0;
          const noShows = slice.reduce((s, r) => s + r.noShows, 0);
          const noShowPct =
            covers > 0 ? Math.round((noShows / Math.max(1, covers + noShows)) * 1000) / 10 : 0;
          return { revenue, covers, avgSpend, noShowPct, turnover: 0 };
        };

        const last1 = rows.slice(-1);
        const last7 = rows.slice(-7);
        const last30 = rows.slice(-30);
        const last365 = rows;

        setAnalyticsMetrics({
          day: reduce(last1),
          week: reduce(last7),
          '2w': reduce(rows.slice(-14)),
          month: reduce(last30),
          '6m': reduce(rows.slice(-180)),
          year: reduce(last365),
        });

        const totalFor = (s: typeof rows) => s.reduce((acc, r) => acc + r.revenue, 0);
        const trendFor = (a: typeof rows, b: typeof rows) => {
          const ta = totalFor(a);
          const tb = totalFor(b);
          if (tb <= 0) return 0;
          return Math.round(((ta - tb) / tb) * 1000) / 10;
        };
        const seriesFor = (s: typeof rows) => s.map((r) => r.revenue);

        setRevenueData({
          day: { total: totalFor(last1), trendPct: trendFor(last1, rows.slice(-2, -1)), series: seriesFor(last1) },
          week: { total: totalFor(last7), trendPct: trendFor(last7, rows.slice(-14, -7)), series: seriesFor(last7) },
          '2w': {
            total: totalFor(rows.slice(-14)),
            trendPct: trendFor(rows.slice(-14), rows.slice(-28, -14)),
            series: seriesFor(rows.slice(-14)),
          },
          month: { total: totalFor(last30), trendPct: trendFor(last30, rows.slice(-60, -30)), series: seriesFor(last30) },
          '6m': {
            total: totalFor(rows.slice(-180)),
            trendPct: trendFor(rows.slice(-180), rows.slice(-360, -180)),
            series: seriesFor(rows.slice(-180)),
          },
          year: { total: totalFor(last365), trendPct: 0, series: seriesFor(last365) },
        });

        // Top guests
        const { data: guestRows } = await supabase
          .from('guests')
          .select('id,full_name,total_visits,average_spend_per_visit,is_vip,no_show_risk_score,lifetime_value_score')
          .eq('restaurant_id', restaurantId)
          .order('total_visits', { ascending: false })
          .limit(4);
        if (!active) return;
        const spotlight: CrmGuest[] = ((guestRows ?? []) as Array<Record<string, unknown>>).map((row) => ({
          id: String(row.id ?? ''),
          name: String(row.full_name ?? 'Guest'),
          isVIP: Boolean(row.is_vip),
          totalVisits: Number(row.total_visits ?? 0) || 0,
          avgSpend: Number(row.average_spend_per_visit ?? 0) || 0,
          lastVisitDate: '',
          churnRisk: Number(row.no_show_risk_score ?? 0) || 0,
          visitFrequency: 0,
          frequency: `${Number(row.total_visits ?? 0)} visits`,
          preference: '',
          preferencesShort: '',
          aiLine: '',
          nextBestAction: '',
          predictedSpendTonight: 0,
          ltvScore: Number(row.lifetime_value_score ?? 0) || 0,
          predictedLifetimeValue: 0,
          hasUpcomingReservation: false,
          isSeated: false,
          visitHistory: [],
          favoriteDishes: [],
          preferredTable: '',
          notes: '',
          noShowNote: '',
          aiSuggestions: [],
        }));
        setCrmSpotlight(spotlight);

        // AI insights
        const { data: aiRows } = await supabase
          .from('ai_suggestions')
          .select('title,summary,rationale')
          .eq('restaurant_id', restaurantId)
          .is('applied_at', null)
          .is('dismissed_at', null)
          .order('generated_at', { ascending: false })
          .limit(5);
        if (!active) return;
        const aiList = ((aiRows ?? []) as Array<Record<string, unknown>>).map((r) =>
          String(r.title ?? r.summary ?? r.rationale ?? ''),
        );
        if (aiList.length) setAiInsightsHome(aiList);
      } catch (err) {
        if (!active) return;
        setLoadError(friendlyError(err, "Couldn't load insights."));
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const metrics = analyticsMetrics[period];
  const revData = revenueData[period];
  const max = Math.max(...revData.series, 1);
  const trendUp = revData.trendPct >= 0;
  // setAnalyticsInsights kept for future wiring (peak/dead/best derivations).
  void setAnalyticsInsights;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: spacing.lg }}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.topSubline}>Performance</Text>
          <Text style={styles.title}>Insights</Text>
        </View>

        {loadError ? (
          <View style={{ marginHorizontal: spacing.md, marginBottom: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: c.gold, backgroundColor: c.bgSurface, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Text style={{ color: c.textPrimary, fontSize: 13, flex: 1 }}>{loadError}</Text>
            <Pressable
              onPress={() => {
                setLoadError(null);
                setReloadKey((k) => k + 1);
              }}
              style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, borderWidth: 1, borderColor: c.gold }}
              accessibilityRole="button"
              accessibilityLabel="Retry loading insights"
            >
              <Text style={{ color: c.gold, fontWeight: '600', fontSize: 13 }}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Revenue card */}
        <View style={styles.sectionPad}>
          <Text style={styles.sectionLabel}>Revenue</Text>
          <View style={styles.revenueCard}>
            <View style={styles.periodRow}>
              {PERIODS.map((p) => (
                <Pressable
                  key={p.key}
                  onPress={() => setPeriod(p.key)}
                  style={[styles.periodChip, period === p.key && styles.periodChipActive]}
                >
                  <Text style={[styles.periodChipText, period === p.key && styles.periodChipTextActive]}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.revenueNum}>{formatCurrency(revData.total, 'cad')}</Text>
            <View style={styles.trendRow}>
              <Text style={trendUp ? styles.trendUp : styles.trendDown}>
                {trendUp ? '↑' : '↓'} {trendUp ? '+' : ''}{revData.trendPct}%
              </Text>
              <Text style={styles.trendVs}>vs prior period</Text>
            </View>

            <View style={styles.chart}>
              {revData.series.map((v, i) => (
                <View key={i} style={styles.barWrap}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(4, (v / max) * 56),
                        backgroundColor: barColor(revData.series, i),
                        opacity: 0.85,
                      },
                    ]}
                  />
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Metric tiles */}
        <View style={[styles.sectionPad, { marginTop: -spacing.xs }]}>
          <View style={styles.tilesRow}>
            <View style={styles.tile}>
              <Text style={styles.tileVal}>{metrics.covers}</Text>
              <Text style={styles.tileLabel}>Covers</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileVal}>${metrics.avgSpend.toFixed(0)}</Text>
              <Text style={styles.tileLabel}>Avg spend</Text>
            </View>
            <View style={styles.tile}>
              <Text style={[styles.tileVal, { color: metrics.noShowPct > 5 ? '#EF4444' : c.textPrimary }]}>
                {metrics.noShowPct}%
              </Text>
              <Text style={styles.tileLabel}>No-show</Text>
            </View>
          </View>
        </View>

        {/* Highlights */}
        <View style={styles.sectionPad}>
          <Text style={styles.sectionLabel}>Highlights</Text>
          <View style={styles.highlightCard}>
            {[
              { icon: 'time-outline' as const, text: analyticsInsights.peakHours },
              { icon: 'moon-outline' as const, text: analyticsInsights.deadHours },
              { icon: 'trending-up-outline' as const, text: analyticsInsights.bestDays },
            ].map((item, i) => (
              <View key={i} style={[styles.highlightRow, i > 0 && styles.highlightDivider]}>
                <Ionicons name={item.icon} size={16} color={c.gold} />
                <Text style={styles.highlightText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CRM spotlight */}
        <View style={styles.sectionPad}>
          <Text style={styles.sectionLabel}>Top guests</Text>
          <View style={styles.crmCard}>
            {crmSpotlight.slice(0, 4).map((guest, i) => (
              <View key={guest.id} style={[styles.crmRow, i > 0 && styles.crmDivider]}>
                <View style={styles.crmAvatar}>
                  <Text style={styles.crmInitials}>{initials(guest.name)}</Text>
                </View>
                <View style={styles.crmInfo}>
                  <Text style={styles.crmName}>{guest.name}</Text>
                  <Text style={styles.crmSub}>{guest.frequency} · {guest.totalVisits} visits</Text>
                </View>
                <Text style={styles.crmSpend}>{formatCurrency(guest.avgSpend, 'cad')}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* AI insight */}
        <View style={styles.sectionPad}>
          <View style={styles.aiCard}>
            <Text style={styles.aiLabel}>AI Insight</Text>
            <Text style={styles.aiText}>{aiInsightsHome[1] ?? aiInsightsHome[0] ?? ''}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
