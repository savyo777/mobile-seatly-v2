import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { RevenuePeriod } from '@/lib/mock/ownerApp';
import { REVENUE_DATA } from '@/lib/mock/ownerApp';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';
import { PeriodToggle } from './PeriodToggle';
import { GlassCard } from './GlassCard';

type Props = {
  period: RevenuePeriod;
  onPeriodChange: (p: RevenuePeriod) => void;
};

function useAnimatedCount(target: number, duration = 650) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    setDisplay(0);
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
}

function barColor(series: number[], index: number): string {
  if (index === 0) return ownerColors.chartPositive;
  return series[index] >= series[index - 1] ? ownerColors.chartPositive : ownerColors.chartNegative;
}

export function RevenueHero({ period, onPeriodChange }: Props) {
  const data = REVENUE_DATA[period];
  const animatedTotal = useAnimatedCount(data.total);
  const max = Math.max(...data.series, 1);
  const trendPositive = data.trendPct >= 0;

  const colors = useMemo(() => data.series.map((_, i) => barColor(data.series, i)), [data.series]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Revenue</Text>
      <PeriodToggle value={period} onChange={onPeriodChange} />
      <GlassCard style={styles.card}>
        <View style={styles.rowTop}>
          <View>
            <Text style={styles.bigNum}>{formatCurrency(animatedTotal, 'cad')}</Text>
            <View style={styles.trendRow}>
              <Text style={[styles.trendArrow, { color: trendPositive ? ownerColors.chartPositive : ownerColors.chartNegative }]}>
                {trendPositive ? '↑' : '↓'}
              </Text>
              <Text style={[styles.trendPct, { color: trendPositive ? ownerColors.chartPositive : ownerColors.chartNegative }]}>
                {trendPositive ? '+' : ''}
                {data.trendPct}%
              </Text>
              <Text style={styles.trendVs}>vs prior period</Text>
            </View>
          </View>
        </View>
        <View style={styles.chart}>
          {data.series.map((v, i) => (
            <ChartBar
              key={`${period}-${i}`}
              value={v}
              max={max}
              fillColor={colors[i] ?? ownerColors.chartPositive}
            />
          ))}
        </View>
      </GlassCard>
    </View>
  );
}

function ChartBar({ value, max, fillColor }: { value: number; max: number; fillColor: string }) {
  const pct = useSharedValue(0);
  const target = max > 0 ? value / max : 0;

  useEffect(() => {
    pct.value = withSpring(target, { damping: 16, stiffness: 140 });
  }, [target, pct]);

  const fillStyle = useAnimatedStyle(() => ({
    height: Math.max(6, pct.value * 100),
  }));

  return (
    <View style={styles.barCol}>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, fillStyle, { backgroundColor: fillColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: ownerColors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  card: {
    padding: 22,
    marginTop: 14,
  },
  rowTop: {
    marginBottom: 20,
  },
  bigNum: {
    fontSize: 38,
    fontWeight: '700',
    color: ownerColors.text,
    letterSpacing: -1,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  trendArrow: {
    fontSize: 18,
    fontWeight: '700',
  },
  trendPct: {
    fontSize: 16,
    fontWeight: '700',
  },
  trendVs: {
    fontSize: 14,
    color: ownerColors.textMuted,
    marginLeft: 4,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 112,
    gap: 5,
  },
  barCol: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '100%',
    height: 100,
    borderRadius: ownerRadii.xl,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: ownerRadii.xl,
  },
});
