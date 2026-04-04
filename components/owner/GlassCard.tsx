import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { ownerColors, ownerRadii, ownerShadow } from '@/lib/theme/ownerTheme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  noShadow?: boolean;
};

export function GlassCard({ children, style, noShadow }: Props) {
  return <View style={[styles.card, !noShadow && ownerShadow.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ownerColors.bgCard,
    borderWidth: 1,
    borderColor: ownerColors.border,
    borderRadius: ownerRadii['2xl'],
    overflow: 'hidden',
  },
});
