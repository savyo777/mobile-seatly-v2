import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LiveTimelineEntry } from '@/lib/mock/ownerApp';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';
import { GlassCard } from './GlassCard';

type Props = {
  entries: LiveTimelineEntry[];
};

function statusAccent(status: LiveTimelineEntry['status']): string {
  switch (status) {
    case 'seated':
      return ownerColors.chartPositive;
    case 'arriving':
      return ownerColors.gold;
    case 'risk':
      return ownerColors.danger;
    case 'completed':
      return ownerColors.textMuted;
    default:
      return ownerColors.gold;
  }
}

export function LiveTimeline({ entries }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Reservations pulse</Text>
      {entries.map((e) => (
        <View key={e.id} style={styles.row}>
          <Text style={styles.time}>{e.timeLabel}</Text>
          <GlassCard
            style={[
              styles.card,
              { borderLeftWidth: 4, borderLeftColor: statusAccent(e.status) },
            ]}
          >
            <View style={styles.cardTop}>
              <Text style={styles.name}>{e.guestName}</Text>
              <View style={[styles.pill, e.status === 'risk' && styles.pillRisk]}>
                <Text style={[styles.pillText, e.status === 'risk' && styles.pillTextRisk]}>
                  {e.statusLabel}
                </Text>
              </View>
            </View>
            <Text style={styles.meta}>
              Party {e.partySize}
              {e.table ? ` · ${e.table}` : ''}
            </Text>
          </GlassCard>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: ownerColors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  row: {
    marginBottom: 14,
  },
  time: {
    fontSize: 14,
    fontWeight: '800',
    color: ownerColors.gold,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  card: {
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 6,
  },
  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: ownerColors.text,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: ownerRadii.xl,
    backgroundColor: ownerColors.goldSubtle,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  pillRisk: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.45)',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: ownerColors.gold,
  },
  pillTextRisk: {
    color: ownerColors.danger,
  },
  meta: {
    fontSize: 14,
    color: ownerColors.textMuted,
  },
});
