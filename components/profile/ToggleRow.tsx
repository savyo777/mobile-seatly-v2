import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { colors, spacing, typography } from '@/lib/theme';

type Props = {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isLast?: boolean;
};

export function ToggleRow({ title, subtitle, value, onValueChange, isLast }: Props) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.bgElevated, true: 'rgba(201, 168, 76, 0.45)' }}
        thumbColor={value ? colors.gold : colors.textMuted}
        ios_backgroundColor={colors.bgElevated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
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
    color: colors.textPrimary,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 4,
  },
});
