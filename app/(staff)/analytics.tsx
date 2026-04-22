import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { OwnerHeader } from '@/components/owner/OwnerHeader';
import { StatCard } from '@/components/owner/StatCard';
import { SectionCard } from '@/components/owner/SectionCard';
import {
  ANALYTICS_INSIGHTS,
  ANALYTICS_METRICS,
  BUSY_HEATMAP,
  REVENUE_DATA,
  type RevenuePeriod,
} from '@/lib/mock/ownerApp';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';

type PerfRange = 'today' | '7d' | '30d' | 'mtd';

const RANGE_MAP: Record<PerfRange, RevenuePeriod> = {
  today: 'day',
  '7d': 'week',
  '30d': 'month',
  mtd: 'month',
};

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
    fontSize: 13,
    fontWeight: '600',
    color: c.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
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

  const period = RANGE_MAP[range];
  const m = ANALYTICS_METRICS[period];
  const series = REVENUE_DATA[period].series;
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
      <OwnerHeader title={t('owner.analyticsTitle')} subtitle="Nova Ristorante" />
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
