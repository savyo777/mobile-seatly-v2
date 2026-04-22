import React, { useMemo } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Restaurant } from '@/lib/mock/restaurants';
import { DiscoverEnhancedCard } from '@/components/discover/DiscoverEnhancedCard';
import { ChevronGlyph } from '@/components/ui/ChevronGlyph';
import { createStyles, spacing, typography, useColors } from '@/lib/theme';

type Props = {
  title: string;
  data: Restaurant[];
  onPressCard: (r: Restaurant) => void;
  onPressSeeAll?: () => void;
};

const useStyles = createStyles((c) => ({
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.3,
    flex: 1,
    paddingRight: spacing.sm,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cell: {
    minWidth: 0,
  },
}));

export function DiscoverGridSection({ title, data, onPressCard, onPressSeeAll }: Props) {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const { width: screenW } = useWindowDimensions();
  const colWidth = useMemo(() => {
    const inner = screenW - spacing.lg * 2;
    return (inner - spacing.md) / 2;
  }, [screenW]);

  if (!data.length) return null;
  const rows: Restaurant[][] = [];
  for (let i = 0; i < data.length; i += 2) {
    rows.push(data.slice(i, i + 2));
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.title}>{title}</Text>
        {onPressSeeAll ? (
          <Pressable onPress={onPressSeeAll} style={styles.seeAllBtn} hitSlop={8}>
            <Text style={styles.seeAllText}>{t('discover.seeAll')}</Text>
            <ChevronGlyph color={c.gold} size={15} />
          </Pressable>
        ) : null}
      </View>
      {rows.map((row, ri) => (
        <View key={`row-${ri}`} style={styles.row}>
          {row.map((item) => (
            <View key={item.id} style={[styles.cell, { width: colWidth }]}>
              <DiscoverEnhancedCard
                restaurant={item}
                width={colWidth}
                onPress={() => onPressCard(item)}
                variant="grid"
              />
            </View>
          ))}
          {row.length === 1 ? <View style={[styles.cell, { width: colWidth }]} /> : null}
        </View>
      ))}
    </View>
  );
}
