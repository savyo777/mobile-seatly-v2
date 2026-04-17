import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { LiveFeedItem } from '@/lib/mock/ownerApp';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';
import { ownerSpace } from '@/lib/theme/ownerTheme';
import { OwnerSectionLabel } from './OwnerSectionLabel';

type Props = {
  items: LiveFeedItem[];
  onViewAll?: () => void;
  viewAllLabel?: string;
};

function kindColor(kind: LiveFeedItem['kind']): string {
  switch (kind) {
    case 'seated':
      return ownerColors.chartPositive;
    case 'order':
      return ownerColors.textSecondary;
    case 'arrived':
      return ownerColors.warning;
    case 'alert':
      return ownerColors.danger;
    default:
      return ownerColors.textMuted;
  }
}

export function OwnerLiveFeed({ items, onViewAll, viewAllLabel }: Props) {
  const { t } = useTranslation();
  const label = viewAllLabel ?? t('owner.overviewViewAll');

  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.titleFlex}>
          <OwnerSectionLabel marginBottom={0}>{t('owner.liveFeedTitle')}</OwnerSectionLabel>
        </View>
        {onViewAll ? (
          <Pressable onPress={onViewAll} hitSlop={8} style={({ pressed }) => [styles.viewAllBtn, pressed && styles.pressed]}>
            <Text style={styles.viewAllText}>{label}</Text>
            <Text style={styles.viewAllChevron}>›</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.shell}>
        {items.map((item, i) => (
          <View key={item.id} style={[styles.row, i > 0 && styles.rowBorder]}>
            <View style={[styles.pipe, { backgroundColor: kindColor(item.kind) }]} />
            <View style={styles.body}>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.time}>{item.timeLabel}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: ownerSpace.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ownerSpace.sm,
    marginBottom: ownerSpace.xs,
  },
  titleFlex: {
    flex: 1,
    minWidth: 0,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingLeft: ownerSpace.sm,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: ownerColors.gold,
  },
  viewAllChevron: {
    fontSize: 18,
    fontWeight: '600',
    color: ownerColors.gold,
    marginTop: -1,
  },
  pressed: {
    opacity: 0.85,
  },
  shell: {
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgElevated,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: ownerSpace.sm,
    paddingHorizontal: ownerSpace.md,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ownerColors.border,
  },
  pipe: {
    width: 3,
    borderRadius: 2,
    marginRight: ownerSpace.sm,
  },
  body: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    color: ownerColors.text,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    fontWeight: '600',
    color: ownerColors.textMuted,
    marginTop: 4,
  },
});
