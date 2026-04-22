import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useColors, createStyles, spacing, typography } from '@/lib/theme';

type Props = {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isLast?: boolean;
};

const useStyles = createStyles((c) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.sm,
  },
  title: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: 4,
  },
}));

export function ToggleRow({ title, subtitle, value, onValueChange, isLast }: Props) {
  const c = useColors();
  const styles = useStyles();

  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: c.bgElevated, true: `${c.gold}80` }}
        thumbColor={value ? c.gold : c.textMuted}
        ios_backgroundColor={c.bgElevated}
      />
    </View>
  );
}
