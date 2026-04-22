import React from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronGlyph } from '@/components/ui/ChevronGlyph';
import type { TrendingDish } from '@/lib/mock/social';
import { getRestaurantForPost } from '@/lib/mock/snaps';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

type Props = {
  title: string;
  data: TrendingDish[];
  onPressDish: (d: TrendingDish) => void;
  onPressSeeAll?: () => void;
};

const useStyles = createStyles((c) => ({
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
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
    fontWeight: '700',
  },
  listContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: 170,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgSurface,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 1.3,
    backgroundColor: c.bgElevated,
  },
  body: {
    padding: spacing.sm,
    gap: 2,
  },
  dish: {
    ...typography.body,
    fontWeight: '700',
    color: c.textPrimary,
  },
  restaurant: {
    ...typography.bodySmall,
    color: c.textMuted,
  },
  meta: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '600',
    fontSize: 11,
    marginTop: 2,
  },
}));

export function TrendingDishesRow({ title, data, onPressDish, onPressSeeAll }: Props) {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();

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
        keyExtractor={(item) => item.dish}
        renderItem={({ item, index }) => {
          const restaurant = getRestaurantForPost(item.samplePost.restaurant_id);
          return (
            <Pressable
              onPress={() => onPressDish(item)}
              style={({ pressed }) => [
                styles.card,
                index === data.length - 1 && { marginRight: spacing.lg },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Image source={{ uri: item.samplePost.image }} style={styles.image} />
              <View style={styles.body}>
                <Text style={styles.dish} numberOfLines={1}>
                  {item.dish}
                </Text>
                <Text style={styles.restaurant} numberOfLines={1}>
                  {restaurant?.name ?? ''}
                </Text>
                <Text style={styles.meta}>
                  {t('discover.trendingDishCount', { count: item.postCount })}
                </Text>
              </View>
            </Pressable>
          );
        }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}
