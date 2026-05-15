import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { borderRadius, createStyles, shadows, spacing, typography } from '@/lib/theme';
import { isLoyaltyEnabled } from '@/lib/config/loyaltyFeature';

interface SnapEntryButtonProps {
  onPress: () => void;
}

const useStyles = createStyles((c) => ({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.6)',
    backgroundColor: 'rgba(201, 168, 76, 0.16)',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    ...shadows.goldGlow,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  spark: {
    width: 7,
    height: 7,
    borderRadius: borderRadius.full,
    backgroundColor: c.goldLight,
  },
  text: {
    ...typography.bodySmall,
    color: c.goldLight,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
}));

export function SnapEntryButton({ onPress }: SnapEntryButtonProps) {
  const styles = useStyles();
  const loyalty = isLoyaltyEnabled();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={loyalty ? 'Post a food photo and earn points' : 'Post a food photo'}
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <View style={styles.spark} />
      <Text style={styles.text}>{loyalty ? 'Snap · earn points' : 'Snap a meal'}</Text>
    </Pressable>
  );
}
