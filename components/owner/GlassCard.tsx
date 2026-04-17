import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { ownerColors, ownerRadii, ownerShadow } from '@/lib/theme/ownerTheme';

export type GlassCardVariant = 'primary' | 'secondary';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: GlassCardVariant;
  elevated?: boolean;
};

export function GlassCard({ children, style, variant = 'primary', elevated = false }: Props) {
  const v = variant === 'secondary' ? styles.secondary : styles.primary;
  const sh = elevated && variant === 'primary' ? ownerShadow.card : null;
  return <View style={[v, sh, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: ownerColors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    borderRadius: ownerRadii.xl,
    overflow: 'hidden',
  },
  secondary: {
    backgroundColor: ownerColors.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    borderRadius: ownerRadii.md,
    overflow: 'hidden',
  },
});
