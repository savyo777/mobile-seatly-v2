import React, { useMemo } from 'react';
import { Dimensions, FlatList, Pressable, Text, View } from 'react-native';
import { ChevronGlyph } from '@/components/ui/ChevronGlyph';
import { createStyles, spacing, typography, useColors } from '@/lib/theme';
import { Restaurant } from '@/lib/mock/restaurants';
import { RestaurantBrowseCard } from './RestaurantBrowseCard';

interface RestaurantCarouselSectionProps {
  title: string;
  data: Restaurant[];
  onPressCard: (restaurant: Restaurant) => void;
  onPressSeeAll?: () => void;
}

const useStyles = createStyles((c) => ({
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: c.textPrimary,
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
  lastCardWrap: {
    marginRight: 0,
  },
}));

export function RestaurantCarouselSection({
  title,
  data,
  onPressCard,
  onPressSeeAll,
}: RestaurantCarouselSectionProps) {
  const c = useColors();
  const styles = useStyles();
  const cardWidth = useMemo(() => Dimensions.get('window').width * 0.72, []);

  if (!data.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={onPressSeeAll} style={styles.seeAllBtn}>
          <Text style={styles.seeAllText}>See all</Text>
          <ChevronGlyph color={c.gold} size={15} />
        </Pressable>
      </View>

      <FlatList
        horizontal
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={[styles.cardWrap, index === data.length - 1 && styles.lastCardWrap]}>
            <RestaurantBrowseCard
              restaurant={item}
              width={cardWidth}
              onPress={() => onPressCard(item)}
            />
          </View>
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        snapToAlignment="start"
        decelerationRate="fast"
      />
    </View>
  );
}
