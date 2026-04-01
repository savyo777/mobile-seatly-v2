import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, ScreenWrapper } from '@/components/ui';
import {
  mockRestaurants,
  type DiscoverSectionKey,
  type Restaurant,
} from '@/lib/mock/restaurants';
import { colors, spacing, borderRadius, typography } from '@/lib/theme';
import { RestaurantCarouselSection } from '@/components/discover/RestaurantCarouselSection';

const FILTER_KEYS = ['all', 'italian', 'japanese', 'french', 'bbq', 'cafe'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

function cuisineMatchesFilter(restaurant: Restaurant, filter: FilterKey): boolean {
  if (filter === 'all') return true;
  const c = restaurant.cuisineType.toLowerCase();
  switch (filter) {
    case 'italian':
      return c.includes('italian');
    case 'japanese':
      return c.includes('japanese');
    case 'french':
      return c.includes('french');
    case 'bbq':
      return c.includes('bbq') || c.includes('steakhouse');
    case 'cafe':
      return c.includes('café') || c.includes('cafe') || c.includes('brunch');
    default:
      return true;
  }
}

const SECTION_ORDER: Array<{ key: DiscoverSectionKey; title: string }> = [
  { key: 'recommended', title: 'Recommended' },
  { key: 'popular-near-you', title: 'Popular Near You' },
  { key: 'best-ambience', title: 'Best Ambience' },
  { key: 'date-night-picks', title: 'Date Night Picks' },
  { key: 'outdoor-seating', title: 'Outdoor Seating' },
  { key: 'top-rated', title: 'Top Rated' },
];

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filterLabel = (key: FilterKey) => {
    const map: Record<FilterKey, string> = {
      all: t('discover.filterAll'),
      italian: t('discover.filterItalian'),
      japanese: t('discover.filterJapanese'),
      french: t('discover.filterFrench'),
      bbq: t('discover.filterBBQ'),
      cafe: t('discover.filterCafe'),
    };
    return map[key];
  };

  const filteredRestaurants = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mockRestaurants.filter((r) => {
      if (!cuisineMatchesFilter(r, filter)) return false;
      if (!r.isActive) return false;
      if (!q) return true;
      const blob = `${r.name} ${r.cuisineType} ${r.description} ${r.tags.join(' ')} ${r.area}`.toLowerCase();
      return blob.includes(q);
    });
  }, [query, filter]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const sectionData = useMemo(
    () =>
      SECTION_ORDER.map((section) => ({
        ...section,
        restaurants: filteredRestaurants.filter((r) => r.featuredIn.includes(section.key)),
      })).filter((section) => section.restaurants.length > 0),
    [filteredRestaurants],
  );

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing['3xl'] },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
        }
      >
        <View style={styles.headerBlock}>
          <View style={styles.topRow}>
            <Text style={styles.logo}>{t('common.appName')}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {}}
              hitSlop={12}
              style={({ pressed }) => [styles.aiBtn, pressed && styles.pressed]}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={26} color={colors.gold} />
            </Pressable>
          </View>

          <Input
            icon="search-outline"
            placeholder={t('discover.searchPlaceholder')}
            value={query}
            onChangeText={setQuery}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {FILTER_KEYS.map((key) => {
              const selected = filter === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setFilter(key)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {filterLabel(key)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {sectionData.length ? (
          sectionData.map((section) => (
            <RestaurantCarouselSection
              key={section.key}
              title={section.title}
              data={section.restaurants}
              onPressCard={(restaurant: Restaurant) => router.push(`/discover/${restaurant.id}`)}
              onPressSeeAll={() => {}}
            />
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('common.noResults')}</Text>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    paddingBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingTop: spacing.sm,
  },
  logo: {
    ...typography.h2,
    color: colors.gold,
    letterSpacing: 4,
    fontWeight: '700',
  },
  aiBtn: {
    padding: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
  chipsRow: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgSurface,
  },
  chipSelected: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
  },
  chipText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: colors.gold,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  empty: {
    paddingVertical: spacing['4xl'],
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
