import React from 'react';
import { Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import type { RevenuePeriod } from '@/lib/mock/ownerApp';
import { createStyles, spacing, borderRadius } from '@/lib/theme';

const PERIODS: { key: RevenuePeriod; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: '2w', label: '2W' },
  { key: 'month', label: 'Month' },
  { key: '6m', label: '6M' },
  { key: 'year', label: 'Year' },
];

type Props = {
  value: RevenuePeriod;
  onChange: (p: RevenuePeriod) => void;
};

export function PeriodToggle({ value, onChange }: Props) {
  const styles = useStyles();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {PERIODS.map(({ key, label }) => {
        const active = value === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const useStyles = createStyles((c) => ({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
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
    fontWeight: '700',
    color: c.textMuted,
  },
  chipTextActive: {
    color: c.bgBase,
  },
  pressed: {
    opacity: 0.85,
  },
}));
