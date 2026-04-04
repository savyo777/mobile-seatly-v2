import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { LiveFeedItem } from '@/lib/mock/ownerApp';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';
import { GlassCard } from './GlassCard';

type Props = {
  items: LiveFeedItem[];
};

function kindColor(kind: LiveFeedItem['kind']): string {
  switch (kind) {
    case 'seated':
      return ownerColors.chartPositive;
    case 'order':
      return ownerColors.gold;
    case 'arrived':
      return ownerColors.warning;
    case 'alert':
      return ownerColors.danger;
    default:
      return ownerColors.textMuted;
  }
}

export function OwnerLiveFeed({ items }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>{t('owner.liveFeedTitle')}</Text>
      <GlassCard style={styles.card}>
        {items.map((item, i) => (
          <View key={item.id} style={[styles.row, i > 0 && styles.rowBorder]}>
            <View style={[styles.pipe, { backgroundColor: kindColor(item.kind) }]} />
            <View style={styles.body}>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.time}>{item.timeLabel}</Text>
            </View>
          </View>
        ))}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: ownerColors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  card: {
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ownerColors.border,
  },
  pipe: {
    width: 3,
    borderRadius: 2,
    marginRight: 12,
  },
  body: {
    flex: 1,
  },
  message: {
    fontSize: 15,
    fontWeight: '600',
    color: ownerColors.text,
    lineHeight: 22,
  },
  time: {
    fontSize: 12,
    fontWeight: '600',
    color: ownerColors.textMuted,
    marginTop: 4,
  },
});
