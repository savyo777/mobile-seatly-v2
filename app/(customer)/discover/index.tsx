import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Input, Badge, ScreenWrapper } from '@/components/ui';
import { mockRestaurants, type Restaurant } from '@/lib/mock/restaurants';
import { colors, spacing, borderRadius, typography, shadows } from '@/lib/theme';

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

function mockDistanceKm(id: string): string {
  const n = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return (0.8 + (n % 50) / 10).toFixed(1);
}

function isAvailableTonight(restaurant: Restaurant): boolean {
  const n = restaurant.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return restaurant.isActive && n % 3 !== 0;
}

function priceRangeLabel(range: number): string {
  return '$'.repeat(range) as string;
}

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filterLabel = useCallback(
    (key: FilterKey) => {
      const map: Record<FilterKey, string> = {
        all: t('discover.filterAll'),
        italian: t('discover.filterItalian'),
        japanese: t('discover.filterJapanese'),
        french: t('discover.filterFrench'),
        bbq: t('discover.filterBBQ'),
        cafe: t('discover.filterCafe'),
      };
      return map[key];
    },
    [t],
  );

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mockRestaurants.filter((r) => {
      if (!cuisineMatchesFilter(r, filter)) return false;
      if (!q) return true;
      const blob = `${r.name} ${r.cuisineType} ${r.description}`.toLowerCase();
      return blob.includes(q);
    });
  }, [query, filter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Restaurant }) => {
      const dist = mockDistanceKm(item.id);
      const available = isAvailableTonight(item);
      return (
        <Card
          onPress={() => router.push(`/discover/${item.id}`)}
          style={styles.card}
          padded={false}
        >
          <Image source={{ uri: item.coverPhotoUrl }} style={styles.cover} />
          <View style={styles.cardBody}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.cuisineType} · {t('discover.kmAway', { distance: dist })}
            </Text>
            <View style={styles.row}>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={colors.gold} />
                <Text style={styles.ratingText}>{item.avgRating.toFixed(1)}</Text>
                <Text style={styles.reviews}> · {t('discover.reviewsCount', { count: item.totalReviews })}</Text>
              </View>
              <Text style={styles.price}>{priceRangeLabel(item.priceRange)}</Text>
            </View>
            {available && (
              <View style={styles.badgeWrap}>
                <Badge label={t('discover.availableTonight')} variant="success" />
              </View>
            )}
          </View>
        </Card>
      );
    },
    [router, t],
  );

  const header = (
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
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{filterLabel(key)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.sectionTitle}>{t('discover.recommended')}</Text>
    </View>
  );

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing['3xl'] }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('common.noResults')}</Text>
          </View>
        }
      />
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
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingTop: 0,
  },
  card: {
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...shadows.card,
  },
  cover: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    backgroundColor: colors.bgElevated,
  },
  cardBody: {
    padding: spacing.lg,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  meta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  ratingText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    marginLeft: 4,
  },
  reviews: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  price: {
    fontSize: 14,
    color: colors.gold,
    fontWeight: '600',
  },
  badgeWrap: {
    marginTop: spacing.md,
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
