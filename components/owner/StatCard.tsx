import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createStyles, spacing, borderRadius, useColors } from '@/lib/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type Delta = {
  text: string;
  positive?: boolean;
};

type Tone = 'default' | 'gold' | 'success' | 'warning' | 'danger';

type Props = {
  label: string;
  value: string;
  /** When true, the primary number is rendered in gold. Use once per screen. */
  accentValue?: boolean;
  /** Optional icon shown in a soft tinted badge. */
  icon?: IoniconName;
  /** Tint of the icon badge (defaults to gold). */
  tone?: Tone;
  /** Optional delta pill (e.g. "+12%"). */
  delta?: Delta;
  /** Optional single-line context ("vs. last week"). */
  caption?: string;
  style?: ViewStyle;
};

const useStyles = createStyles((c) => ({
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.md,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deltaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
  },
  deltaText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.1,
  },
  deltaPos: { color: c.success },
  deltaNeg: { color: c.danger },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textMuted,
    letterSpacing: 0.2,
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  valueAccent: {
    color: c.gold,
  },
  caption: {
    fontSize: 11,
    color: c.textMuted,
    fontWeight: '500',
  },
}));

function toneStyle(c: ReturnType<typeof useColors>, tone: Tone) {
  switch (tone) {
    case 'success':
      return { bg: `${c.success}1F`, fg: c.success };
    case 'warning':
      return { bg: `${c.warning}26`, fg: c.warning };
    case 'danger':
      return { bg: `${c.danger}22`, fg: c.danger };
    case 'gold':
      return { bg: `${c.gold}22`, fg: c.gold };
    default:
      return { bg: c.bgElevated, fg: c.textSecondary };
  }
}

export function StatCard({
  label,
  value,
  accentValue,
  icon,
  tone = 'gold',
  delta,
  caption,
  style,
}: Props) {
  const c = useColors();
  const styles = useStyles();
  const ts = toneStyle(c, tone);

  return (
    <View style={[styles.card, style]}>
      {(icon || delta) && (
        <View style={styles.topRow}>
          {icon ? (
            <View style={[styles.iconBadge, { backgroundColor: ts.bg }]}>
              <Ionicons name={icon} size={15} color={ts.fg} />
            </View>
          ) : (
            <View />
          )}
          {delta ? (
            <View style={styles.deltaChip}>
              <Ionicons
                name={
                  delta.positive === true
                    ? 'arrow-up'
                    : delta.positive === false
                      ? 'arrow-down'
                      : 'remove'
                }
                size={10}
                color={
                  delta.positive === true
                    ? c.success
                    : delta.positive === false
                      ? c.danger
                      : c.textMuted
                }
              />
              <Text
                style={[
                  styles.deltaText,
                  delta.positive === true && styles.deltaPos,
                  delta.positive === false && styles.deltaNeg,
                ]}
              >
                {delta.text}
              </Text>
            </View>
          ) : null}
        </View>
      )}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, accentValue && styles.valueAccent]} numberOfLines={1}>
        {value}
      </Text>
      {caption ? (
        <Text style={styles.caption} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}
