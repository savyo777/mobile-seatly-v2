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
    paddingVertical: 7,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  chipActive: {
    backgroundColor: `${c.gold}16`,
    borderColor: c.gold,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textMuted,
  },
  chipTextActive: {
    color: c.gold,
  },
  pressed: {
    opacity: 0.85,
  },
}));
