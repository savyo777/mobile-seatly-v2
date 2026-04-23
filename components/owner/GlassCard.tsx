import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { borderRadius, createStyles } from '@/lib/theme';
import { ownerShadow } from '@/lib/theme/ownerTheme';

export type GlassCardVariant = 'primary' | 'secondary';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: GlassCardVariant;
  elevated?: boolean;
};

export function GlassCard({ children, style, variant = 'primary', elevated = false }: Props) {
  const styles = useStyles();
  const v = variant === 'secondary' ? styles.secondary : styles.primary;
  const sh = elevated && variant === 'primary' ? ownerShadow.card : null;
  return <View style={[v, sh, style]}>{children}</View>;
}

const useStyles = createStyles((c) => ({
  primary: {
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  secondary: {
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
}));
