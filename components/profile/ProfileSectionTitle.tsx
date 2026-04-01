import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '@/lib/theme';

export function ProfileSectionTitle({ children }: { children: string }) {
  return <Text style={styles.text}>{children}</Text>;
}

const styles = StyleSheet.create({
  text: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
});
