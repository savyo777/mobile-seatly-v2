import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import type { DateFilter, EventType } from '@/lib/mock/events';

type TypeFilterKey = EventType | 'all';

const DATE_CHIPS: { key: DateFilter; label: string }[] = [
  { key: 'tonight', label: 'Tonight' },
  { key: 'this_weekend', label: 'This Weekend' },
  { key: 'this_week', label: 'This Week' },
  { key: 'all', label: 'All Dates' },
];

const TYPE_CHIPS: { key: TypeFilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'event', label: 'Events' },
  { key: 'promotion', label: 'Promotions' },
  { key: 'happy_hour', label: 'Happy Hour' },
  { key: 'tasting_menu', label: 'Tasting Menu' },
];

const useStyles = createStyles((c) => ({
  root: {
    gap: 8,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  row: {
    paddingHorizontal: spacing.md,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowType: {
    paddingTop: 0,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipActive: {
    backgroundColor: c.gold,
    borderColor: c.gold,
  },
  chipType: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipTypeActive: {
    backgroundColor: 'rgba(201,162,74,0.15)',
    borderColor: 'rgba(201,162,74,0.4)',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textMuted,
    letterSpacing: 0.1,
  },
  chipTextActive: {
    color: c.textPrimary,
  },
}));

type Props = {
  dateFilter: DateFilter;
  typeFilter: TypeFilterKey;
  onDateChange: (f: DateFilter) => void;
  onTypeChange: (f: TypeFilterKey) => void;
};

export function EventFilterBar({ dateFilter, typeFilter, onDateChange, onTypeChange }: Props) {
  const styles = useStyles();

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {DATE_CHIPS.map((chip) => {
          const active = chip.key === dateFilter;
          return (
            <Pressable key={chip.key} onPress={() => onDateChange(chip.key)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.row, styles.rowType]}>
        {TYPE_CHIPS.map((chip) => {
          const active = chip.key === typeFilter;
          return (
            <Pressable key={chip.key} onPress={() => onTypeChange(chip.key)} style={[styles.chip, styles.chipType, active && styles.chipTypeActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
