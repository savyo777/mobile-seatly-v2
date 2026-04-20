import React from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronGlyph } from '@/components/ui/ChevronGlyph';
import type { TrendingDish } from '@/lib/mock/social';
import { getRestaurantForPost } from '@/lib/mock/snaps';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';

type Props = {
  title: string;
  data: TrendingDish[];
  onPressDish: (d: TrendingDish) => void;
  onPressSeeAll?: () => void;
};

export function TrendingDishesRow({ title, data, onPressDish, onPressSeeAll }: Props) {
  const { t } = useTranslation();

  if (!data.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.title}>{title}</Text>
        {onPressSeeAll ? (
          <Pressable onPress={onPressSeeAll} style={styles.seeAllBtn} hitSlop={8}>
            <Text style={styles.seeAllText}>{t('discover.seeAll')}</Text>
            <ChevronGlyph color={colors.gold} size={18} />
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

const styles = StyleSheet.create({
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
    fontWeight: '700',
  },
  listContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: 170,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 1.3,
    backgroundColor: colors.bgElevated,
  },
  body: {
    padding: spacing.sm,
    gap: 2,
  },
  dish: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  restaurant: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  meta: {
    ...typography.bodySmall,
    color: colors.gold,
    fontWeight: '600',
    fontSize: 11,
    marginTop: 2,
  },
});
