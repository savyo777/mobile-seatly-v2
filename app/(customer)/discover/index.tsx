import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input, ScreenWrapper } from '@/components/ui';
import { DiscoverHeroFeatured } from '@/components/discover/DiscoverHeroFeatured';
import { DiscoverHorizontalSection } from '@/components/discover/DiscoverHorizontalSection';
import { DiscoverMapView } from '@/components/discover/DiscoverMapView';
import { PostVisitPrompt } from '@/components/snaps/PostVisitPrompt';
import { TrendingDishesRow } from '@/components/discover/TrendingDishesRow';
import { DISCOVER_USER_FIRST_NAME } from '@/lib/constants/personalization';
import type { DiscoverCategorySlug } from '@/lib/discover/discoverCategories';
import { getTorontoGreetingPeriod } from '@/lib/discover/torontoTime';
import { loadRestaurantsForDiscover } from '@/lib/data/restaurantCatalog';
import { pickFeaturedRestaurant } from '@/lib/mock/discoverPresentation';
import { mockRestaurants, type Restaurant } from '@/lib/mock/restaurants';
import {
  searchUsers,
  isFollowing,
  follow,
  unfollow,
  listTrendingRestaurants,
  listTrendingDishes,
} from '@/lib/mock/social';
import { getUnreadCount } from '@/lib/mock/notifications';
import { mockCustomer } from '@/lib/mock/users';
import type { SnapUser } from '@/lib/mock/snaps';
import { useColors, createStyles, spacing, borderRadius, typography } from '@/lib/theme';

const ME = mockCustomer.id;

const FILTER_KEYS = ['all', 'italian', 'japanese', 'french', 'seafood'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];
type SearchMode = 'restaurants' | 'people';
type QuickFilter = 'dateNight' | 'nearMe' | 'availableNow' | 'cheapEats';

function cuisineMatchesFilter(restaurant: Restaurant, filter: FilterKey): boolean {
  if (filter === 'all') return true;
  const c = restaurant.cuisineType.toLowerCase();
  switch (filter) {
    case 'italian': return c.includes('italian');
    case 'japanese': return c.includes('japanese');
    case 'french': return c.includes('french');
    case 'seafood': return c.includes('seafood') || c.includes('fish');
    default: return true;
  }
}

function excludeById(list: Restaurant[], id: string | null): Restaurant[] {
  if (!id) return list;
  return list.filter((r) => r.id !== id);
}

type ViewMode = 'list' | 'map';

const useStyles = createStyles((c) => ({
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: c.bgBase,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  logo: {
    ...typography.h2,
    color: c.gold,
    letterSpacing: 4,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bellBtn: {
    padding: 4,
  },
  bellDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.danger,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
  },
  toggleBtnActive: {
    backgroundColor: c.gold,
  },
  toggleLabel: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: c.textMuted,
  },
  toggleLabelActive: {
    color: c.bgBase,
  },
  headerBlock: {
    paddingBottom: 0,
  },
  pressed: {
    opacity: 0.7,
  },
  greetingBlock: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  greetingLine1: {
    fontSize: 28,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  greetingLine2: {
    fontSize: 28,
    fontWeight: '800',
    color: c.gold,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  vibeChipsRow: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  vibeChip: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: c.bgSurface,
  },
  vibeChipSelected: {
    borderColor: c.gold,
    backgroundColor: c.gold,
  },
  vibeChipPressed: {
    opacity: 0.85,
  },
  vibeChipText: {
    ...typography.bodySmall,
    color: c.textMuted,
    fontWeight: '600',
  },
  vibeChipTextSelected: {
    color: c.bgBase,
    fontWeight: '700',
  },
  chipsRow: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  chip: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: c.bgSurface,
  },
  chipSelected: {
    borderColor: c.gold,
    backgroundColor: c.gold,
  },
  chipText: {
    ...typography.bodySmall,
    color: c.textMuted,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: c.bgBase,
    fontWeight: '700',
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
    color: c.textMuted,
  },
}));

const usePeopleStyles = createStyles((c) => ({
  list: {
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.bgElevated,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    ...typography.body,
    fontWeight: '600',
    color: c.textPrimary,
    flex: 1,
  },
  followBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: c.gold,
  },
  followBtnActive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: c.border,
  },
  followBtnText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: c.bgBase,
  },
  followBtnTextActive: {
    color: c.textPrimary,
  },
  empty: {
    paddingTop: spacing['4xl'],
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: c.textMuted,
  },
}));

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchMode, setSearchMode] = useState<SearchMode>('restaurants');
  const [baseRestaurants, setBaseRestaurants] = useState<Restaurant[]>(mockRestaurants);
  const [unreadCount, setUnreadCount] = useState(() => getUnreadCount(ME));

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
      all: 'All',
      italian: 'Italian',
      japanese: 'Japanese',
      french: 'French',
      seafood: 'Seafood',
    };
    return map[key];
  };

  const { greetingLine1, greetingLine2 } = useMemo(() => {
    const period = getTorontoGreetingPeriod();
    const name = DISCOVER_USER_FIRST_NAME;
    const greetMap: Record<string, string> = {
      morning: `Good morning, ${name} —`,
      afternoon: `Good afternoon, ${name} —`,
      evening: `Good evening, ${name} —`,
    };
    const taglineMap: Record<string, string> = {
      morning: "this morning's picks are ready.",
      afternoon: "this afternoon's picks are ready.",
      evening: "tonight's picks are ready.",
    };
    return {
      greetingLine1: greetMap[period] ?? greetMap.evening,
      greetingLine2: taglineMap[period] ?? taglineMap.evening,
    };
  }, []);

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

  const mostSnappedData = useMemo(() => {
    const trending = listTrendingRestaurants(7);
    const idToRestaurant = new Map(baseRestaurants.map((r) => [r.id, r]));
    return trending
      .map((t) => idToRestaurant.get(t.restaurantId))
      .filter((r): r is Restaurant => !!r)
      .slice(0, 10);
  }, [baseRestaurants]);

  const trendingDishes = useMemo(() => listTrendingDishes(7).slice(0, 10), []);

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
    router.push(`/booking/${r.id}/step2-time` as Href);
  };

  const goCategory = (slug: DiscoverCategorySlug) => {
    router.push(`/(customer)/discover/category/${slug}` as Href);
  };

  const onSearchChange = (text: string) => {
    setQuery(text);
    if (text.trim()) setQuickFilter(null);
  };

  const peopleResults = useMemo(
    () => (searchMode === 'people' ? searchUsers(query) : []),
    [searchMode, query],
  );

  const toggleQuick = (key: QuickFilter) => {
    setQuery('');
    setQuickFilter((prev) => (prev === key ? null : key));
  };

  const quickChipStyle = (active: boolean) => [styles.vibeChip, active && styles.vibeChipSelected];

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      {/* Sticky header: logo + List/Map toggle + bell */}
      <View style={[styles.stickyHeader, { paddingTop: spacing.xs }]}>
        <Text style={styles.logo}>{t('common.appName')}</Text>
        <View style={styles.headerRight}>
          <View style={styles.viewToggle}>
            <Pressable
              onPress={() => setViewMode('list')}
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleLabel, viewMode === 'list' && styles.toggleLabelActive]}>List</Text>
            </Pressable>
            <Pressable
              onPress={() => setViewMode('map')}
              style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleLabel, viewMode === 'map' && styles.toggleLabelActive]}>Map</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => {
              router.push('/(customer)/notifications' as Href);
              setUnreadCount(0);
            }}
            hitSlop={8}
            style={styles.bellBtn}
          >
            <Ionicons name="notifications-outline" size={22} color={c.textPrimary} />
            {unreadCount > 0 ? <View style={styles.bellDot} /> : null}
          </Pressable>
        </View>
      </View>

      {viewMode === 'map' ? (
        <DiscoverMapView />
      ) : (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing['3xl'] },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.gold} />
        }
      >
        <View style={styles.headerBlock}>
          <PostVisitPrompt />

          {/* Search bar */}
          <Input
            placeholder="Restaurants, cuisines, neighborhoods..."
            value={query}
            onChangeText={onSearchChange}
            icon="search-outline"
          />

          {/* Quick filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.vibeChipsRow}
          >
            {(
              [
                { key: 'dateNight', label: t('discover.chipDateNight') },
                { key: 'nearMe', label: t('discover.chipNearMe') },
                { key: 'availableNow', label: t('discover.chipAvailableNow') },
                { key: 'cheapEats', label: t('discover.chipCheapEats') },
              ] as { key: QuickFilter; label: string }[]
            ).map(({ key, label }) => (
              <Pressable
                key={key}
                onPress={() => toggleQuick(key)}
                style={({ pressed }) => [
                  ...quickChipStyle(quickFilter === key),
                  pressed && styles.vibeChipPressed,
                ]}
              >
                <Text style={[styles.vibeChipText, quickFilter === key && styles.vibeChipTextSelected]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Two-part greeting */}
          <View style={styles.greetingBlock}>
            <Text style={styles.greetingLine1}>{greetingLine1}</Text>
            <Text style={styles.greetingLine2}>{greetingLine2}</Text>
          </View>

          {/* Cuisine chips */}
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

        {searchMode === 'people' ? (
          <PeopleResults users={peopleResults} router={router} />
        ) : !filteredRestaurants.length ? (
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

            <DiscoverHorizontalSection
              title={t('discover.sectionMostSnapped')}
              data={mostSnappedData}
              onPressCard={openRestaurant}
              onPressSeeAll={() => router.push('/(customer)/discover/explore' as Href)}
            />

            <TrendingDishesRow
              title={t('discover.sectionTrendingDishes')}
              data={trendingDishes}
              onPressDish={(d) =>
                router.push(`/(customer)/discover/snaps/detail/${d.samplePost.id}` as Href)
              }
              onPressSeeAll={() => router.push('/(customer)/discover/explore' as Href)}
            />

            <DiscoverHorizontalSection
              title="Trending Worldwide"
              data={baseRestaurants.slice().sort((a, b) => b.avgRating - a.avgRating).slice(0, 8)}
              onPressCard={openRestaurant}
              onPressSeeAll={() => goCategory('trending')}
            />
          </>
        )}
      </ScrollView>
      )}
    </ScreenWrapper>
  );
}

function PeopleResults({
  users,
  router,
}: {
  users: SnapUser[];
  router: ReturnType<typeof useRouter>;
}) {
  const c = useColors();
  const peopleStyles = usePeopleStyles();
  const [followState, setFollowState] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    users.forEach((u) => { init[u.id] = isFollowing(ME, u.id); });
    return init;
  });

  const handleFollow = (userId: string) => {
    const currently = followState[userId] ?? false;
    if (currently) unfollow(ME, userId);
    else follow(ME, userId);
    setFollowState((prev) => ({ ...prev, [userId]: !currently }));
  };

  if (users.length === 0) {
    return (
      <View style={peopleStyles.empty}>
        <Text style={peopleStyles.emptyText}>No people found</Text>
      </View>
    );
  }

  return (
    <View style={peopleStyles.list}>
      {users.map((user) => {
        const following = followState[user.id] ?? false;
        const isSelf = user.id === ME;
        return (
          <Pressable
            key={user.id}
            style={({ pressed }) => [peopleStyles.row, pressed && { opacity: 0.75 }]}
            onPress={() => router.push(`/(customer)/profile/${user.id}` as Href)}
          >
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={peopleStyles.avatar} />
            ) : (
              <View style={[peopleStyles.avatar, peopleStyles.avatarFallback]}>
                <Ionicons name="person" size={18} color={c.textMuted} />
              </View>
            )}
            <Text style={peopleStyles.username} numberOfLines={1}>
              @{user.username}
            </Text>
            {!isSelf && (
              <Pressable
                onPress={() => handleFollow(user.id)}
                style={[peopleStyles.followBtn, following && peopleStyles.followBtnActive]}
              >
                <Text style={[peopleStyles.followBtnText, following && peopleStyles.followBtnTextActive]}>
                  {following ? 'Following' : 'Follow'}
                </Text>
              </Pressable>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
