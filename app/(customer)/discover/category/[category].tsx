import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter, Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper } from '@/components/ui';
import { DiscoverEnhancedCard } from '@/components/discover/DiscoverEnhancedCard';
import {
  DISCOVER_CATEGORY_TITLE_KEYS,
  isDiscoverCategorySlug,
  restaurantsForDiscoverCategory,
  type DiscoverCategorySlug,
} from '@/lib/discover/discoverCategories';
import { mockRestaurants, type Restaurant } from '@/lib/mock/restaurants';
import { colors, spacing, typography } from '@/lib/theme';

export default function DiscoverCategoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { category: raw } = useLocalSearchParams<{ category: string }>();

  const slug = typeof raw === 'string' ? raw : '';
  const valid = isDiscoverCategorySlug(slug);

  const title = valid ? t(DISCOVER_CATEGORY_TITLE_KEYS[slug as DiscoverCategorySlug]) : t('discover.categoryInvalid');

  const data = useMemo(() => {
    if (!valid) return [];
    const active = mockRestaurants.filter((r) => r.isActive);
    return restaurantsForDiscoverCategory(slug as DiscoverCategorySlug, active);
  }, [slug, valid]);

  type GridCell = { kind: 'restaurant'; restaurant: Restaurant } | { kind: 'spacer' };

  const gridCells = useMemo((): GridCell[] => {
    const cells: GridCell[] = data.map((restaurant) => ({ kind: 'restaurant', restaurant }));
    if (cells.length % 2 === 1) cells.push({ kind: 'spacer' });
    return cells;
  }, [data]);

  const colGap = spacing.md;
  const horizontalPad = spacing.lg * 2;
  const inner = width - horizontalPad;
  const colW = (inner - colGap) / 2;

  const openRestaurant = (id: string) => {
    router.push(`/(customer)/discover/${id}` as Href);
  };

  if (!valid) {
    return (
      <ScreenWrapper scrollable={false} padded={false}>
        <View style={[styles.invalidWrap, { paddingTop: insets.top + spacing.md }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
            style={styles.backRow}
            hitSlop={12}
          >
            <Text style={styles.backChevron} accessible={false}>
              ←
            </Text>
            <Text style={styles.backText}>{t('common.back')}</Text>
          </Pressable>
          <Text style={styles.invalidText}>{t('discover.categoryInvalid')}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backPressed]}
          hitSlop={12}
        >
          <Text style={styles.backChevron} accessible={false}>
            ←
          </Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={2}>
          {title}
        </Text>
      </View>

      <FlatList
        data={gridCells}
        numColumns={2}
        keyExtractor={(item, index) => (item.kind === 'spacer' ? `spacer-${index}` : item.restaurant.id)}
        columnWrapperStyle={[styles.gridRow, { gap: colGap }]}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing['3xl'] },
        ]}
        ListEmptyComponent={<Text style={styles.empty}>{t('discover.categoryEmpty')}</Text>}
        renderItem={({ item }) =>
          item.kind === 'spacer' ? (
            <View style={{ width: colW }} />
          ) : (
            <DiscoverEnhancedCard
              restaurant={item.restaurant}
              width={colW}
              onPress={() => openRestaurant(item.restaurant.id)}
              variant="grid"
              gridImageHeight={114}
            />
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
    minWidth: 40,
    justifyContent: 'center',
  },
  backPressed: {
    opacity: 0.75,
  },
  backChevron: {
    fontSize: 26,
    lineHeight: 28,
    color: colors.gold,
    fontWeight: '400',
  },
  headerTitle: {
    flex: 1,
    ...typography.h3,
    fontSize: 17,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  gridRow: {
    marginBottom: spacing.md,
    justifyContent: 'flex-start',
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing['3xl'],
    width: '100%',
  },
  invalidWrap: {
    paddingHorizontal: spacing.lg,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  backText: {
    ...typography.body,
    color: colors.gold,
    fontWeight: '600',
  },
  invalidText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
