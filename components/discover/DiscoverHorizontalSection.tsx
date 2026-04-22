import React, { useMemo } from 'react';
import { FlatList, Pressable, Text, useWindowDimensions, View } from 'react-native';
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
  listContent: {
    paddingRight: spacing.lg,
  },
  cardWrap: {
    marginRight: spacing.md,
  },
  lastWrap: {
    marginRight: 0,
  },
}));

export function DiscoverHorizontalSection({ title, data, onPressCard, onPressSeeAll }: Props) {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const { width: winW } = useWindowDimensions();
  const cardWidth = useMemo(() => Math.min(winW * 0.72, 280), [winW]);

  if (!data.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.title}>{title}</Text>
        {onPressSeeAll ? (
          <Pressable onPress={onPressSeeAll} style={styles.seeAllBtn} hitSlop={8}>
            <Text style={styles.seeAllText}>{t('discover.seeAll')}</Text>
            <ChevronGlyph color={c.gold} size={18} />
          </Pressable>
        ) : null}
      </View>
      <FlatList
        horizontal
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={[styles.cardWrap, index === data.length - 1 && styles.lastWrap]}>
            <DiscoverEnhancedCard
              restaurant={item}
              width={cardWidth}
              onPress={() => onPressCard(item)}
              variant="carousel"
            />
          </View>
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}
