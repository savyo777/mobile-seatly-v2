import React from 'react';
import { Text, type TextProps } from 'react-native';
import { createStyles, spacing } from '@/lib/theme';

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
  marginBottom = spacing.sm,
  marginTop = 0,
  ...rest
}: Props) {
  const styles = useStyles();
  return (
    <Text style={[styles.label, { marginBottom, marginTop }, style]} {...rest}>
      {children}
    </Text>
  );
}

const useStyles = createStyles((c) => ({
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
}));
