import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function PreferenceChip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
      ]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  chipSelected: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
  },
  chipPressed: {
    opacity: 0.85,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  labelSelected: {
    color: colors.gold,
  },
});
