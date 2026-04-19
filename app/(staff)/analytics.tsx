import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { PeriodToggle } from '@/components/owner/PeriodToggle';
import { GlassCard } from '@/components/owner/GlassCard';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import {
  ANALYTICS_INSIGHTS,
  ANALYTICS_METRICS,
  BUSY_HEATMAP,
  CRM_SPOTLIGHT,
  REVENUE_DATA,
  type RevenuePeriod,
} from '@/lib/mock/ownerApp';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';

function barColor(series: number[], index: number): string {
  if (index === 0) return ownerColors.chartPositive;
  return series[index] >= series[index - 1] ? ownerColors.chartPositive : ownerColors.chartNegative;
}

function heatRgb(p: number): string {
  const r = Math.round(34 + (239 - 34) * p);
  const g = Math.round(197 + (68 - 197) * p);
  const b = Math.round(94 + (68 - 94) * p);
  return `rgba(${r},${g},${b},0.88)`;
}

export default function OwnerAnalyticsScreen() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<RevenuePeriod>('week');

  const m = ANALYTICS_METRICS[period];
  const series = REVENUE_DATA[period].series;
  const maxBar = Math.max(...series, 1);

  const heatColors = useMemo(() => {
    const max = Math.max(...BUSY_HEATMAP, 1);
    return BUSY_HEATMAP.map((v) => v / max);
  }, []);

  return (
    <OwnerScreen>
      <SubpageHeader title={t('owner.analyticsTitle')} fallbackTab="more" />
      <PeriodToggle value={period} onChange={setPeriod} />

      <Animated.View entering={FadeInUp.delay(80)} style={styles.grid}>
        <MetricTile label={t('owner.metricRevenue')} value={formatCurrency(m.revenue, 'cad')} />
        <MetricTile label={t('owner.metricCovers')} value={String(m.covers)} />
        <MetricTile label={t('owner.metricAvgSpend')} value={formatCurrency(m.avgSpend, 'cad')} />
        <MetricTile label={t('owner.metricNoShow')} value={`${m.noShowPct}%`} accent />
        <MetricTile label={t('owner.metricTurnover')} value={`${m.turnover}x`} wide />
      </Animated.View>

      <Text style={styles.section}>{t('owner.chartDaily')}</Text>
      <GlassCard style={styles.chartCard}>
        <View style={styles.barRow}>
          {series.map((v, i) => (
            <View key={i} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { height: `${Math.max(8, (v / maxBar) * 100)}%`, backgroundColor: barColor(series, i) },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </GlassCard>

      <Text style={styles.section}>{t('owner.chartTrend')}</Text>
      <GlassCard style={styles.trendCard}>
        <View style={styles.trendRow}>
          {series.map((v, i) => (
            <View key={i} style={styles.trendPointWrap}>
              <View style={[styles.trendDot, { opacity: 0.35 + (v / maxBar) * 0.65 }]} />
            </View>
          ))}
        </View>
        <View style={styles.trendLine} />
      </GlassCard>

      <Text style={styles.section}>{t('owner.chartHeat')}</Text>
      <GlassCard style={styles.heatCard}>
        <View style={styles.heatRow}>
          {heatColors.map((p, h) => (
            <View key={h} style={[styles.heatCell, { backgroundColor: heatRgb(p) }]} />
          ))}
        </View>
        <Text style={styles.heatHint}>{t('owner.chartHeatHint')}</Text>
      </GlassCard>

      <Text style={styles.section}>{t('owner.analyticsInsightsTitle')}</Text>
      <GlassCard style={styles.insightCard}>
        <Text style={styles.insightLine}>
          <Text style={styles.insightKey}>{t('owner.insightPeak')} </Text>
          {ANALYTICS_INSIGHTS.peakHours}
        </Text>
        <Text style={[styles.insightLine, styles.insightSpacer]}>
          <Text style={styles.insightKey}>{t('owner.insightDead')} </Text>
          {ANALYTICS_INSIGHTS.deadHours}
        </Text>
        <Text style={styles.insightLine}>
          <Text style={styles.insightKey}>{t('owner.insightBestDays')} </Text>
          {ANALYTICS_INSIGHTS.bestDays}
        </Text>
      </GlassCard>

      <Text style={styles.section}>{t('owner.crmTitle')}</Text>
      {CRM_SPOTLIGHT.map((c) => (
        <GlassCard key={c.id} style={styles.crmCard}>
          <View style={styles.crmTop}>
            <Text style={styles.crmName}>{c.name}</Text>
            {c.isVIP ? (
              <View style={styles.vipPill}>
                <Text style={styles.vipText}>{t('owner.crmVip')}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.crmMeta}>
            {t('owner.crmVisits', { count: c.totalVisits })} · {t('owner.crmAvg', { amount: formatCurrency(c.avgSpend, 'cad') })}{' '}
            · {c.frequency}
          </Text>
          <Text style={styles.crmPref}>
            {t('owner.crmPref')}: {c.preference}
          </Text>
        </GlassCard>
      ))}

      <GlassCard style={styles.compareCard}>
        <Text style={styles.compareText}>{t('owner.compareWeek')}</Text>
        <Text style={styles.compareSub}>{t('owner.compareMonth')}</Text>
      </GlassCard>
    </OwnerScreen>
  );
}

function MetricTile({
  label,
  value,
  accent,
  wide,
}: {
  label: string;
  value: string;
  accent?: boolean;
  wide?: boolean;
}) {
  return (
    <View style={[styles.tile, accent && styles.tileAccent, wide && styles.tileWide]}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  tile: {
    width: '47%',
    padding: 16,
    borderRadius: ownerRadii['2xl'],
    backgroundColor: ownerColors.bgGlass,
    borderWidth: 1,
    borderColor: ownerColors.border,
  },
  tileWide: {
    width: '100%',
  },
  tileAccent: {
    borderColor: 'rgba(212, 175, 55, 0.45)',
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: ownerColors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tileValue: {
    fontSize: 22,
    fontWeight: '800',
    color: ownerColors.text,
  },
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: ownerColors.textMuted,
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 10,
  },
  chartCard: {
    padding: 16,
    marginBottom: 8,
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
    borderRadius: ownerRadii.xl,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: ownerRadii.xl,
  },
  trendCard: {
    padding: 20,
    marginBottom: 8,
    minHeight: 72,
    justifyContent: 'center',
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 40,
  },
  trendPointWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  trendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ownerColors.gold,
  },
  trendLine: {
    height: 2,
    backgroundColor: 'rgba(212, 175, 55, 0.35)',
    marginTop: -6,
    borderRadius: 1,
  },
  heatCard: {
    padding: 16,
    marginBottom: 16,
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
    color: ownerColors.textMuted,
    marginTop: 10,
  },
  insightCard: {
    padding: 18,
    marginBottom: 8,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  insightLine: {
    fontSize: 15,
    fontWeight: '600',
    color: ownerColors.textSecondary,
    lineHeight: 22,
  },
  insightSpacer: {
    marginTop: 12,
    marginBottom: 12,
  },
  insightKey: {
    color: ownerColors.gold,
    fontWeight: '800',
  },
  crmCard: {
    padding: 16,
    marginBottom: 10,
  },
  crmTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  crmName: {
    fontSize: 17,
    fontWeight: '800',
    color: ownerColors.text,
    flex: 1,
  },
  vipPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: ownerRadii.xl,
    borderWidth: 1,
    borderColor: ownerColors.gold,
    backgroundColor: ownerColors.goldSubtle,
  },
  vipText: {
    fontSize: 11,
    fontWeight: '800',
    color: ownerColors.gold,
    letterSpacing: 0.6,
  },
  crmMeta: {
    fontSize: 14,
    color: ownerColors.textMuted,
    marginBottom: 6,
  },
  crmPref: {
    fontSize: 14,
    fontWeight: '600',
    color: ownerColors.textSecondary,
  },
  compareCard: {
    padding: 20,
    marginBottom: 24,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  compareText: {
    fontSize: 16,
    fontWeight: '700',
    color: ownerColors.text,
    marginBottom: 6,
  },
  compareSub: {
    fontSize: 14,
    color: ownerColors.textMuted,
  },
});
