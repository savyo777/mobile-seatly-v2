import React from 'react';
import { Text, StyleSheet, type TextProps } from 'react-native';
import { ownerColors, ownerSpace } from '@/lib/theme/ownerTheme';

type Props = TextProps & {
  children: React.ReactNode;
  /** Extra margin below (default: ownerSpace.sm) */
  marginBottom?: number;
  marginTop?: number;
};

/** Uppercase section kicker — muted, consistent across owner app */
export function OwnerSectionLabel({
  children,
  style,
  marginBottom = ownerSpace.sm,
  marginTop = 0,
  ...rest
}: Props) {
  return (
    <Text style={[styles.label, { marginBottom, marginTop }, style]} {...rest}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: ownerColors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
