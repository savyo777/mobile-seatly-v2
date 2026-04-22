import React from 'react';
import { Text, Pressable } from 'react-native';
import { useColors, createStyles, spacing, typography, borderRadius } from '@/lib/theme';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

const useStyles = createStyles((c) => ({
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgElevated,
  },
  chipSelected: {
    borderColor: c.gold,
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
  },
  chipPressed: {
    opacity: 0.85,
  },
  label: {
    ...typography.bodySmall,
    color: c.textSecondary,
    fontWeight: '600',
  },
  labelSelected: {
    color: c.gold,
  },
}));

export function PreferenceChip({ label, selected, onPress }: Props) {
  const styles = useStyles();

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
