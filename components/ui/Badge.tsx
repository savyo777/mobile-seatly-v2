import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors, createStyles, borderRadius } from '@/lib/theme';

type BadgeVariant = 'gold' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const useStyles = createStyles((c) => ({
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
}));

export function Badge({ label, variant = 'gold', size = 'sm' }: BadgeProps) {
  const c = useColors();
  const styles = useStyles();

  const variantColors: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
    gold: { bg: 'rgba(201, 168, 76, 0.15)', text: c.gold, border: c.gold },
    success: { bg: 'rgba(34, 197, 94, 0.15)', text: c.success, border: c.success },
    warning: { bg: 'rgba(245, 158, 11, 0.15)', text: c.warning, border: c.warning },
    danger: { bg: 'rgba(239, 68, 68, 0.15)', text: c.danger, border: c.danger },
    info: { bg: 'rgba(59, 130, 246, 0.15)', text: c.info, border: c.info },
    muted: { bg: 'rgba(255, 255, 255, 0.08)', text: c.textSecondary, border: c.border },
  };

  const vc = variantColors[variant];
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: vc.bg, borderColor: vc.border }, isSmall && styles.small]}>
      <Text style={[styles.text, { color: vc.text }, isSmall && styles.smallText]}>{label}</Text>
    </View>
  );
}
