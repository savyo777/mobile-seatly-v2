import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import Svg, { Polyline, Circle, Line, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';

type Props = {
  /** Short label, e.g. "Reservations this week". */
  label: string;
  /** Large headline number (e.g. tonight's count on the books). */
  headlineValue: string;
  /** Small line under headline, e.g. "guests expected tonight". */
  headlineHint: string;
  dayLabels: string[];
  counts: number[];
  vsPrevWeekPct: number;
  onPress?: () => void;
};

const CHART_HEIGHT = 112;
const PAD_X = 4;
const PAD_Y = 10;

const useStyles = createStyles((c) => ({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  inner: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textMuted,
    marginBottom: spacing.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  headline: {
    fontSize: 40,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -1.2,
    lineHeight: 44,
  },
  hint: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textSecondary,
    marginTop: 2,
    maxWidth: '62%',
  },
  trendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  trendPos: { backgroundColor: `${c.success}26` },
  trendNeg: { backgroundColor: `${c.danger}26` },
  trendText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  trendPosText: { color: c.success },
  trendNegText: { color: c.danger },
  chartLabelsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  chartLabelCell: {
    flex: 1,
    alignItems: 'center',
  },
  chartLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: c.textMuted,
    textAlign: 'center',
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  caption: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: c.textSecondary,
    lineHeight: 20,
  },
}));

export function HomeBookingTrendCard({
  label,
  headlineValue,
  headlineHint,
  dayLabels,
  counts,
  vsPrevWeekPct,
  onPress,
}: Props) {
  const c = useColors();
  const styles = useStyles();
  const { width: winW } = useWindowDimensions();
  const chartW = winW - spacing.lg * 2 - spacing.lg * 2;

  const { linePoints, areaPath, lastCx, lastCy } = useMemo(() => {
    const vals = counts.length ? counts : [0];
    const hi = Math.max(...vals, 1);
    const lo = Math.min(...vals, 0);
    const range = Math.max(hi - lo, 1);
    const innerW = chartW - PAD_X * 2;
    const innerH = CHART_HEIGHT - PAD_Y * 2;
    const pts: { x: number; y: number }[] = vals.map((v, i) => {
      const x = PAD_X + (vals.length <= 1 ? innerW / 2 : (i / (vals.length - 1)) * innerW);
      const n = (v - lo) / range;
      const y = PAD_Y + innerH * (1 - n);
      return { x, y };
    });
    const lineStr = pts.map((p) => `${p.x},${p.y}`).join(' ');
    const firstX = pts[0]?.x ?? PAD_X;
    const lastX = pts[pts.length - 1]?.x ?? PAD_X;
    const baseY = PAD_Y + innerH;
    const pathD =
      pts.length > 0
        ? `M ${firstX} ${baseY} L ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')} L ${lastX} ${baseY} Z`
        : '';
    const last = pts[pts.length - 1] ?? { x: 0, y: 0 };
    return {
      linePoints: lineStr,
      areaPath: pathD,
      lastCx: last.x,
      lastCy: last.y,
      max: hi,
      min: lo,
    };
  }, [counts, chartW]);

  const trendUp = vsPrevWeekPct >= 0;
  const trendLabel = `${trendUp ? '+' : ''}${vsPrevWeekPct}%`;

  const content = (
    <View style={styles.card}>
      <View style={styles.inner}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.headline} numberOfLines={1} allowFontScaling>
              {headlineValue}
            </Text>
            <Text style={styles.hint} numberOfLines={2}>
              {headlineHint}
            </Text>
          </View>
          <View style={[styles.trendChip, trendUp ? styles.trendPos : styles.trendNeg]}>
            <Ionicons
              name={trendUp ? 'trending-up' : 'trending-down'}
              size={13}
              color={trendUp ? c.success : c.danger}
            />
            <Text
              style={[styles.trendText, trendUp ? styles.trendPosText : styles.trendNegText]}
            >
              {trendLabel}
            </Text>
          </View>
        </View>

        <Svg width={chartW} height={CHART_HEIGHT} accessibilityLabel="Bookings trend chart">
          <Defs>
            <LinearGradient id="bookingArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c.gold} stopOpacity="0.35" />
              <Stop offset="1" stopColor={c.gold} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          {/* Baseline */}
          <Line
            x1={PAD_X}
            y1={CHART_HEIGHT - PAD_Y}
            x2={chartW - PAD_X}
            y2={CHART_HEIGHT - PAD_Y}
            stroke={c.border}
            strokeWidth={StyleSheet.hairlineWidth}
          />
          {areaPath ? <Path d={areaPath} fill="url(#bookingArea)" /> : null}
          <Polyline
            points={linePoints}
            fill="none"
            stroke={c.gold}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {counts.length > 0 ? (
            <Circle cx={lastCx} cy={lastCy} r={5} fill={c.gold} stroke={c.bgSurface} strokeWidth={2} />
          ) : null}
        </Svg>

        <View style={styles.chartLabelsRow}>
          {dayLabels.map((d) => (
            <View key={d} style={styles.chartLabelCell}>
              <Text style={styles.chartLabel} numberOfLines={1}>
                {d}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.captionRow}>
          <Ionicons name="calendar-outline" size={18} color={c.textMuted} />
          <Text style={styles.caption} numberOfLines={2}>
            {trendUp
              ? 'More reservations than last week — keep an eye on table turns.'
              : 'Fewer reservations than last week — a waitlist nudge can help fill gaps.'}
          </Text>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${headlineValue} ${headlineHint}. Trend ${trendLabel} vs last week.`}
      >
        {content}
      </Pressable>
    );
  }
  return content;
}
