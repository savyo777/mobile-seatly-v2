import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import {
  ANALYTICS_METRICS,
  ANALYTICS_INSIGHTS,
  CRM_SPOTLIGHT,
  AI_INSIGHTS_HOME,
  REVENUE_DATA,
  type RevenuePeriod,
} from '@/lib/mock/ownerApp';
import { formatCurrency } from '@/lib/utils/formatCurrency';

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

  const metrics = ANALYTICS_METRICS[period];
  const revData = REVENUE_DATA[period];
  const max = Math.max(...revData.series, 1);
  const trendUp = revData.trendPct >= 0;

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
              { icon: 'time-outline' as const, text: ANALYTICS_INSIGHTS.peakHours },
              { icon: 'moon-outline' as const, text: ANALYTICS_INSIGHTS.deadHours },
              { icon: 'trending-up-outline' as const, text: ANALYTICS_INSIGHTS.bestDays },
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
            {CRM_SPOTLIGHT.slice(0, 4).map((guest, i) => (
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
            <Text style={styles.aiText}>{AI_INSIGHTS_HOME[1]}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
