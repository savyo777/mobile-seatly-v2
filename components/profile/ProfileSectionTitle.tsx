import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useColors, createStyles, typography, spacing } from '@/lib/theme';

type Props = {
  children: string;
  /** Sentence-case hub headers (e.g. account home) */
  hub?: boolean;
};

const useStyles = createStyles((c) => ({
  text: {
    ...typography.label,
    color: c.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  hub: {
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 15,
    fontWeight: '600',
    color: c.textSecondary,
    marginTop: spacing.xl,
  },
}));

export function ProfileSectionTitle({ children, hub }: Props) {
  const styles = useStyles();
  return <Text style={[styles.text, hub && styles.hub]}>{children}</Text>;
}
