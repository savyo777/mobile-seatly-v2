import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProfileStackScreen } from './ProfileStackScreen';
import { useColors, createStyles, spacing, typography } from '@/lib/theme';

type Section = {
  heading?: string;
  paragraphs: string[];
};

type Props = {
  title: string;
  sections: Section[];
};

const useStyles = createStyles((c) => ({
  section: {
    marginBottom: spacing['2xl'],
  },
  heading: {
    ...typography.h3,
    color: c.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  paragraph: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginBottom: spacing['2xl'],
  },
}));

export function LegalScreen({ title, sections }: Props) {
  const styles = useStyles();
  return (
    <ProfileStackScreen title={title}>
      {sections.map((s, i) => (
        <View key={i} style={styles.section}>
          {s.heading ? <Text style={styles.heading}>{s.heading}</Text> : null}
          {s.paragraphs.map((p, j) => (
            <Text key={j} style={styles.paragraph}>{p}</Text>
          ))}
          {i < sections.length - 1 && <View style={styles.divider} />}
        </View>
      ))}
    </ProfileStackScreen>
  );
}
