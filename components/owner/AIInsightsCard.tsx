import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';
import { GlassCard } from './GlassCard';

type Props = {
  title: string;
  bullets: string[];
};

export function AIInsightsCard({ title, bullets }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <GlassCard style={styles.card}>
        {bullets.map((line, i) => (
          <View key={i} style={[styles.row, i > 0 && styles.rowBorder]}>
            <View style={styles.dot} />
            <Text style={styles.text}>{line}</Text>
          </View>
        ))}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: ownerColors.gold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  card: {
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ownerColors.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: ownerRadii.xl,
    backgroundColor: ownerColors.gold,
    marginTop: 6,
  },
  text: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: ownerColors.textSecondary,
  },
});
