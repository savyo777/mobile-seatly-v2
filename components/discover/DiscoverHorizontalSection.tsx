import React, { memo, useCallback, useMemo } from 'react';
import { FlatList, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Restaurant } from '@/lib/mock/restaurants';
import { DiscoverEnhancedCard } from '@/components/discover/DiscoverEnhancedCard';
import { ChevronGlyph } from '@/components/ui/ChevronGlyph';
import { isCompactDiscoverEnabled } from '@/lib/config/discoverDensity';
import { isDiscoverFullBleedEnabled } from '@/lib/config/discoverFullBleed';
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

function DiscoverHorizontalSectionBase({ title, data, onPressCard, onPressSeeAll }: Props) {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const { width: winW } = useWindowDimensions();
  const compact = isCompactDiscoverEnabled();
  const fullBleed = isDiscoverFullBleedEnabled();
  const cardWidth = useMemo(
    () => (compact ? Math.min(winW * 0.46, 170) : Math.min(winW * 0.72, 280)),
    [winW, compact],
  );
  const cardGap = compact ? spacing.sm : spacing.md;
  const trailingPad = compact ? spacing.md : spacing.lg;
  const itemStride = cardWidth + cardGap;
  const renderItem = useCallback(
    ({ item, index }: { item: Restaurant; index: number }) => (
      <View
        style={[
          { marginRight: cardGap },
          index === data.length - 1 && styles.lastWrap,
        ]}
      >
        <DiscoverEnhancedCard
          restaurant={item}
          width={cardWidth}
          onPress={() => onPressCard(item)}
          variant="carousel"
          compact={compact}
        />
      </View>
    ),
    [cardWidth, cardGap, compact, data.length, onPressCard, styles.lastWrap],
  );
  const getItemLayout = useCallback(
    (_: ArrayLike<Restaurant> | null | undefined, index: number) => ({
      length: itemStride,
      offset: itemStride * index,
      index,
    }),
    [itemStride],
  );

  if (!data.length) return null;

  return (
    <View style={styles.section}>
      <View
        style={[
          styles.sectionHeader,
          fullBleed && { paddingHorizontal: spacing.md },
        ]}
      >
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
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        updateCellsBatchingPeriod={24}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingRight: trailingPad },
          fullBleed && { paddingLeft: 0 },
        ]}
      />
    </View>
  );
}

export const DiscoverHorizontalSection = memo(DiscoverHorizontalSectionBase);
