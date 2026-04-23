import React from 'react';
import { Text, type TextProps } from 'react-native';
import { createStyles, spacing } from '@/lib/theme';

type Props = TextProps & {
  children: React.ReactNode;
  marginBottom?: number;
  marginTop?: number;
  /** `section` = 18/800 (Uber/Cal, matches SectionCard). `kicker` = small muted uppercase for rare cases. */
  variant?: 'section' | 'kicker';
};

/** Section title or optional uppercase kicker — default matches Discover / SectionCard. */
export function OwnerSectionLabel({
  children,
  style,
  marginBottom = spacing.md,
  marginTop = 0,
  variant = 'section',
  ...rest
}: Props) {
  const styles = useStyles();
  const t = variant === 'kicker' ? styles.kicker : styles.section;
  return (
    <Text style={[t, { marginBottom, marginTop }, style]} {...rest}>
      {children}
    </Text>
  );
}

const useStyles = createStyles((c) => ({
  section: {
    fontSize: 18,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.3,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
}));
