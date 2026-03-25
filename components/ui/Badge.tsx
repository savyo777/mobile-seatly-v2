import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius } from '@/lib/theme';

type BadgeVariant = 'gold' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const variantColors: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  gold: { bg: 'rgba(201, 168, 76, 0.15)', text: colors.gold, border: colors.gold },
  success: { bg: 'rgba(34, 197, 94, 0.15)', text: colors.success, border: colors.success },
  warning: { bg: 'rgba(245, 158, 11, 0.15)', text: colors.warning, border: colors.warning },
  danger: { bg: 'rgba(239, 68, 68, 0.15)', text: colors.danger, border: colors.danger },
  info: { bg: 'rgba(59, 130, 246, 0.15)', text: colors.info, border: colors.info },
  muted: { bg: 'rgba(255, 255, 255, 0.08)', text: colors.textSecondary, border: colors.border },
};

export function Badge({ label, variant = 'gold', size = 'sm' }: BadgeProps) {
  const c = variantColors[variant];
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }, isSmall && styles.small]}>
      <Text style={[styles.text, { color: c.text }, isSmall && styles.smallText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  smallText: {
    fontSize: 11,
  },
});
