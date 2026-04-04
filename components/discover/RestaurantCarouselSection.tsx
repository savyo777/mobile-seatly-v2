import React, { useMemo } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronGlyph } from '@/components/ui/ChevronGlyph';
import { colors, spacing, typography } from '@/lib/theme';
import { Restaurant } from '@/lib/mock/restaurants';
import { RestaurantBrowseCard } from './RestaurantBrowseCard';

interface RestaurantCarouselSectionProps {
  title: string;
  data: Restaurant[];
  onPressCard: (restaurant: Restaurant) => void;
  onPressSeeAll?: () => void;
}

export function RestaurantCarouselSection({
  title,
  data,
  onPressCard,
  onPressSeeAll,
}: RestaurantCarouselSectionProps) {
  const cardWidth = useMemo(() => Dimensions.get('window').width * 0.72, []);

  if (!data.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={onPressSeeAll} style={styles.seeAllBtn}>
          <Text style={styles.seeAllText}>See all</Text>
          <ChevronGlyph color={colors.gold} size={15} />
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

const styles = StyleSheet.create({
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
    color: colors.textPrimary,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    ...typography.bodySmall,
    color: colors.gold,
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
});
