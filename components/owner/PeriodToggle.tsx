import React from 'react';
import { Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import type { RevenuePeriod } from '@/lib/mock/ownerApp';
import { ownerColors, ownerRadii, ownerSpace } from '@/lib/theme/ownerTheme';

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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: ownerSpace.xs,
    paddingVertical: 2,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: ownerSpace.sm,
    borderRadius: ownerRadii.sm,
    backgroundColor: ownerColors.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
  },
  chipActive: {
    backgroundColor: ownerColors.goldSubtle,
    borderColor: ownerColors.gold,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: ownerColors.textMuted,
  },
  chipTextActive: {
    color: ownerColors.gold,
  },
  pressed: {
    opacity: 0.85,
  },
});
