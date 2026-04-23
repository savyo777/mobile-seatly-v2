import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  label: string;
  value: string;
  trendLabel: string;
  trendPositive: boolean;
  healthSummary: string;
  /** Hourly series used for the sparkline (0..n). */
  sparkline?: number[];
  /** Highlighted index in the sparkline (e.g. current hour). */
  currentIndex?: number;
  onPress?: () => void;
};

const useStyles = createStyles((c) => ({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  gradient: {
    padding: spacing.xl,
    paddingBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textMuted,
    marginBottom: spacing.xs,
    letterSpacing: 0,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  value: {
    fontSize: 44,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -1.4,
    lineHeight: 48,
  },
  trendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  trendPos: {
    backgroundColor: `${c.success}26`,
  },
  trendNeg: {
    backgroundColor: `${c.danger}26`,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  trendPosText: { color: c.success },
  trendNegText: { color: c.danger },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  healthText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: c.textSecondary,
    lineHeight: 20,
  },
  sparkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 32,
    marginTop: spacing.md,
  },
  sparkBar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 2,
  },
}));

export function HomeHero({
  label,
  value,
  trendLabel,
  trendPositive,
  healthSummary,
  sparkline,
  currentIndex,
  onPress,
}: Props) {
  const c = useColors();
  const { effective } = useTheme();
  const styles = useStyles();

  const gradient =
    effective === 'dark'
      ? ([`${c.goldDark}40`, '#0B0A08', c.bgSurface] as const)
      : ([`${c.gold}1A`, '#FAF7EF', c.bgSurface] as const);

  const max = sparkline && sparkline.length > 0 ? Math.max(...sparkline, 1) : 1;

  const content = (
    <View style={styles.card}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value} numberOfLines={1} allowFontScaling>
            {value}
          </Text>
          <View
            style={[styles.trendChip, trendPositive ? styles.trendPos : styles.trendNeg]}
          >
            <Ionicons
              name={trendPositive ? 'trending-up' : 'trending-down'}
              size={13}
              color={trendPositive ? c.success : c.danger}
            />
            <Text
              style={[
                styles.trendText,
                trendPositive ? styles.trendPosText : styles.trendNegText,
              ]}
            >
              {trendLabel}
            </Text>
          </View>
        </View>

        {sparkline && sparkline.length > 0 ? (
          <View style={styles.sparkRow} accessibilityElementsHidden>
            {sparkline.map((v, i) => {
              const h = Math.max(2, Math.round((v / max) * 32));
              const isCurrent = currentIndex === i;
              return (
                <View
                  key={i}
                  style={[
                    styles.sparkBar,
                    {
                      height: h,
                      backgroundColor: isCurrent ? c.gold : `${c.gold}55`,
                      opacity: isCurrent ? 1 : 0.7,
                    },
                  ]}
                />
              );
            })}
          </View>
        ) : null}

        <View style={styles.healthRow}>
          <Ionicons name="pulse-outline" size={16} color={c.textMuted} />
          <Text style={styles.healthText} numberOfLines={2}>
            {healthSummary}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
        {content}
      </Pressable>
    );
  }
  return content;
}
