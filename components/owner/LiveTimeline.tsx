import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LiveTimelineEntry } from '@/lib/mock/ownerApp';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';
import { ownerSpace } from '@/lib/theme/ownerTheme';
import { OwnerSectionLabel } from './OwnerSectionLabel';

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
      return ownerColors.textMuted;
  }
}

export function LiveTimeline({ entries }: Props) {
  return (
    <View style={styles.wrap}>
      <OwnerSectionLabel>Reservations pulse</OwnerSectionLabel>
      {entries.map((e) => (
        <View key={e.id} style={styles.row}>
          <Text style={styles.time}>{e.timeLabel}</Text>
          <View style={styles.card}>
            <View style={[styles.accent, { backgroundColor: statusAccent(e.status) }]} />
            <View style={styles.cardInner}>
              <View style={styles.cardTop}>
                <Text style={styles.name}>{e.guestName}</Text>
                <View style={[styles.pill, e.status === 'risk' && styles.pillRisk]}>
                  <Text style={[styles.pillText, e.status === 'risk' && styles.pillTextRisk]}>{e.statusLabel}</Text>
                </View>
              </View>
              <Text style={styles.meta}>
                Party {e.partySize}
                {e.table ? ` · ${e.table}` : ''}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: ownerSpace.sm,
  },
  row: {
    marginBottom: ownerSpace.md,
  },
  time: {
    fontSize: 13,
    fontWeight: '700',
    color: ownerColors.textMuted,
    marginBottom: ownerSpace.xs,
    letterSpacing: 0.2,
  },
  card: {
    flexDirection: 'row',
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgElevated,
    overflow: 'hidden',
  },
  accent: {
    width: 3,
  },
  cardInner: {
    flex: 1,
    paddingVertical: ownerSpace.sm,
    paddingHorizontal: ownerSpace.md,
    paddingLeft: ownerSpace.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: ownerSpace.sm,
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: ownerColors.text,
  },
  pill: {
    paddingHorizontal: ownerSpace.xs,
    paddingVertical: 3,
    borderRadius: ownerRadii.sm,
    backgroundColor: ownerColors.bgGlass,
  },
  pillRisk: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: ownerColors.textSecondary,
  },
  pillTextRisk: {
    color: ownerColors.danger,
  },
  meta: {
    fontSize: 13,
    color: ownerColors.textMuted,
  },
});
