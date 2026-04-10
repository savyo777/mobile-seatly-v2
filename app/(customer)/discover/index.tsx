import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, ScreenWrapper } from '@/components/ui';
import { DiscoverHeroFeatured } from '@/components/discover/DiscoverHeroFeatured';
import { DiscoverHorizontalSection } from '@/components/discover/DiscoverHorizontalSection';
import { SnapEntryButton } from '@/components/discover/SnapEntryButton';
import { DISCOVER_USER_FIRST_NAME } from '@/lib/constants/personalization';
import type { DiscoverCategorySlug } from '@/lib/discover/discoverCategories';
import { getTorontoGreetingPeriod } from '@/lib/discover/torontoTime';
import { loadRestaurantsForDiscover } from '@/lib/data/restaurantCatalog';
import { pickFeaturedRestaurant } from '@/lib/mock/discoverPresentation';
import { mockRestaurants, type Restaurant } from '@/lib/mock/restaurants';
import { colors, spacing, borderRadius, typography } from '@/lib/theme';

const FILTER_KEYS = ['all', 'italian', 'japanese', 'french'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

type QuickFilter = 'dateNight' | 'nearMe' | 'availableNow' | 'cheapEats';

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
    default:
      return true;
  }
}

function excludeById(list: Restaurant[], id: string | null): Restaurant[] {
  if (!id) return list;
  return list.filter((r) => r.id !== id);
}

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [baseRestaurants, setBaseRestaurants] = useState<Restaurant[]>(mockRestaurants);

  useEffect(() => {
    let cancelled = false;
    loadRestaurantsForDiscover().then(({ list }) => {
      if (!cancelled) setBaseRestaurants(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filterLabel = (key: FilterKey) => {
    const map: Record<FilterKey, string> = {
      all: t('discover.filterAll'),
      italian: t('discover.filterItalian'),
      japanese: t('discover.filterJapanese'),
      french: t('discover.filterFrench'),
    };
    return map[key];
  };

  const namedGreeting = useMemo(() => {
    const period = getTorontoGreetingPeriod();
    const name = DISCOVER_USER_FIRST_NAME;
    if (period === 'morning') return t('discover.greetingMorningNamed', { name });
    if (period === 'afternoon') return t('discover.greetingAfternoonNamed', { name });
    return t('discover.greetingEveningNamed', { name });
  }, [t]);

  const filteredRestaurants = useMemo(() => {
    let list = baseRestaurants.filter((r) => {
      if (!cuisineMatchesFilter(r, filter)) return false;
      if (!r.isActive) return false;
      return true;
    });

    if (quickFilter === 'dateNight') {
      list = list.filter((r) => r.featuredIn.includes('date-night-picks'));
    } else if (quickFilter === 'availableNow') {
      list = list.filter((r) => r.availability === 'Available Tonight');
    } else if (quickFilter === 'cheapEats') {
      list = list.filter((r) => r.priceRange <= 2);
    }

    if (quickFilter === 'nearMe') {
      list = [...list].sort((a, b) => a.distanceKm - b.distanceKm);
    }

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const blob = `${r.name} ${r.cuisineType} ${r.description} ${r.tags.join(' ')} ${r.area} ${r.ambiance}`.toLowerCase();
        return blob.includes(q);
      });
    }

    return list;
  }, [baseRestaurants, query, filter, quickFilter]);

  const featured = useMemo(
    () => pickFeaturedRestaurant(filteredRestaurants),
    [filteredRestaurants],
  );

  const withoutFeatured = useMemo(
    () => excludeById(filteredRestaurants, featured?.id ?? null),
    [filteredRestaurants, featured],
  );

  const trendingData = useMemo(() => {
    const hit = withoutFeatured.filter((r) => r.featuredIn.includes('popular-near-you'));
    return (hit.length ? hit : withoutFeatured).slice(0, 12);
  }, [withoutFeatured]);

  const dateNightData = useMemo(() => {
    const hit = withoutFeatured.filter((r) => r.featuredIn.includes('date-night-picks'));
    return (hit.length ? hit : withoutFeatured).slice(0, 12);
  }, [withoutFeatured]);

  const outdoorData = useMemo(() => {
    const hit = withoutFeatured.filter((r) => r.featuredIn.includes('outdoor-seating'));
    return (hit.length ? hit : withoutFeatured).slice(0, 12);
  }, [withoutFeatured]);

  const tasteData = useMemo(() => {
    const hit = withoutFeatured.filter((r) => r.featuredIn.includes('recommended'));
    return (hit.length ? hit : withoutFeatured).slice(0, 12);
  }, [withoutFeatured]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRestaurantsForDiscover()
      .then(({ list }) => setBaseRestaurants(list))
      .finally(() => {
        setTimeout(() => setRefreshing(false), 400);
      });
  };

  const openRestaurant = (r: Restaurant) => {
    router.push(`/(customer)/discover/${r.id}` as Href);
  };

  const reserveRestaurant = (r: Restaurant) => {
    router.push(`/booking/${r.id}/step1-date` as Href);
  };

  const goCategory = (slug: DiscoverCategorySlug) => {
    router.push(`/(customer)/discover/category/${slug}` as Href);
  };

  const onSearchChange = (text: string) => {
    setQuery(text);
    if (text.trim()) setQuickFilter(null);
  };

  const toggleQuick = (key: QuickFilter) => {
    setQuery('');
    setQuickFilter((prev) => (prev === key ? null : key));
  };

  const quickChipStyle = (active: boolean) => [styles.vibeChip, active && styles.vibeChipSelected];

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
            <SnapEntryButton onPress={() => router.push('/(customer)/discover/post-review')} />
          </View>

          <Input
            placeholder={t('discover.searchPlaceholder')}
            value={query}
            onChangeText={onSearchChange}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.vibeChipsRow}
          >
            <Pressable
              onPress={() => toggleQuick('dateNight')}
              style={({ pressed }) => [
                ...quickChipStyle(quickFilter === 'dateNight'),
                pressed && styles.vibeChipPressed,
              ]}
            >
              <Text style={[styles.vibeChipText, quickFilter === 'dateNight' && styles.vibeChipTextSelected]}>
                {t('discover.chipDateNight')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => toggleQuick('nearMe')}
              style={({ pressed }) => [
                ...quickChipStyle(quickFilter === 'nearMe'),
                pressed && styles.vibeChipPressed,
              ]}
            >
              <Text style={[styles.vibeChipText, quickFilter === 'nearMe' && styles.vibeChipTextSelected]}>
                {t('discover.chipNearMe')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => toggleQuick('availableNow')}
              style={({ pressed }) => [
                ...quickChipStyle(quickFilter === 'availableNow'),
                pressed && styles.vibeChipPressed,
              ]}
            >
              <Text style={[styles.vibeChipText, quickFilter === 'availableNow' && styles.vibeChipTextSelected]}>
                {t('discover.chipAvailableNow')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => toggleQuick('cheapEats')}
              style={({ pressed }) => [
                ...quickChipStyle(quickFilter === 'cheapEats'),
                pressed && styles.vibeChipPressed,
              ]}
            >
              <Text style={[styles.vibeChipText, quickFilter === 'cheapEats' && styles.vibeChipTextSelected]}>
                {t('discover.chipCheapEats')}
              </Text>
            </Pressable>
          </ScrollView>

          <View style={styles.greetingBlock}>
            <Text style={styles.personalGreeting}>{namedGreeting}</Text>
          </View>

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

        {!filteredRestaurants.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('common.noResults')}</Text>
          </View>
        ) : (
          <>
            {featured ? (
              <DiscoverHeroFeatured
                restaurant={featured}
                onPressCard={() => openRestaurant(featured)}
                onPressReserve={() => reserveRestaurant(featured)}
              />
            ) : null}

            <DiscoverHorizontalSection
              title={t('discover.sectionTrending')}
              data={trendingData}
              onPressCard={openRestaurant}
              onPressSeeAll={() => goCategory('trending')}
            />

            <DiscoverHorizontalSection
              title={t('discover.sectionDateNight')}
              data={dateNightData}
              onPressCard={openRestaurant}
              onPressSeeAll={() => goCategory('date-night')}
            />

            <DiscoverHorizontalSection
              title={t('discover.sectionOutdoor')}
              data={outdoorData}
              onPressCard={openRestaurant}
              onPressSeeAll={() => goCategory('outdoor-seating')}
            />

            <DiscoverHorizontalSection
              title={t('discover.sectionTaste')}
              data={tasteData}
              onPressCard={openRestaurant}
              onPressSeeAll={() => goCategory('taste')}
            />
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    paddingBottom: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  logo: {
    ...typography.h2,
    color: colors.gold,
    letterSpacing: 4,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
  greetingBlock: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  personalGreeting: {
    fontSize: 23,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.45,
    lineHeight: 28,
  },
  vibeChipsRow: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  vibeChip: {
    borderWidth: 1.5,
    borderColor: 'rgba(201, 168, 76, 0.35)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(201, 168, 76, 0.06)',
  },
  vibeChipSelected: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(201, 168, 76, 0.14)',
  },
  vibeChipPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  vibeChipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  vibeChipTextSelected: {
    color: colors.goldLight,
  },
  chipsRow: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing['2xl'],
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    backgroundColor: colors.bgSurface,
  },
  chipSelected: {
    borderColor: 'rgba(201, 168, 76, 0.5)',
    backgroundColor: 'rgba(201, 168, 76, 0.08)',
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.gold,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
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
