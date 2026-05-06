import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, ScrollView, Image, Pressable, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Badge, ScreenWrapper } from '@/components/ui';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { mockMenuItems, type MenuItem as MockMenuItem } from '@/lib/mock/menuItems';
import { useMenu } from '@/lib/context/MenuContext';
import { loadRestaurantsForDiscover } from '@/lib/data/restaurantCatalog';
import {
  usePublicMenuCategories,
  usePublicMenuItems,
  type MenuItem as PublicMenuItem,
} from '@/lib/cenaiva/api/dataHooks';
import { listSnapPostsByRestaurant } from '@/lib/mock/snaps';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { useColors, createStyles, spacing, borderRadius, typography, shadows } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MENU_ALL_TAB = '__all__';

type HoursRange = { open: string; close: string };
type HoursByWeekday = Partial<Record<typeof WEEKDAY_KEYS[number], HoursRange | null | undefined>>;
type ParsedClockTime = {
  hour: number;
  minute: number;
  minutes: number;
  hasMeridiem: boolean;
};

function priceRangeLabel(range: number): string {
  return '$'.repeat(range) as string;
}

function parseClockTime(value: string | null | undefined): ParsedClockTime | null {
  const cleaned = String(value ?? '').trim().toLowerCase().replace(/\./g, '');
  const match = cleaned.match(/^(\d{1,2})(?::(\d{1,2}))?(?::\d{1,2})?\s*(am|pm)?$/);
  if (!match) return null;

  const rawHour = Number(match[1]);
  const minute = match[2] == null ? 0 : Number(match[2]);
  const meridiem = match[3] as 'am' | 'pm' | undefined;
  if (!Number.isFinite(rawHour) || !Number.isFinite(minute) || minute < 0 || minute > 59) {
    return null;
  }
  if (!meridiem && (rawHour < 0 || rawHour > 23)) return null;
  if (meridiem && (rawHour < 1 || rawHour > 12)) return null;

  let hour = rawHour;
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;

  return {
    hour,
    minute,
    minutes: hour * 60 + minute,
    hasMeridiem: Boolean(meridiem),
  };
}

function normalizeHoursRange(hours: HoursRange | null | undefined): { open: number; close: number } | null {
  if (!hours) return null;
  const open = parseClockTime(hours.open);
  const close = parseClockTime(hours.close);
  if (!open || !close) return null;

  let closeMinutes = close.minutes;
  if (!close.hasMeridiem && closeMinutes <= open.minutes) {
    closeMinutes += open.minutes < 12 * 60 && close.hour <= 12 ? 12 * 60 : 24 * 60;
    if (closeMinutes <= open.minutes) closeMinutes += 12 * 60;
  } else if (closeMinutes <= open.minutes) {
    closeMinutes += 24 * 60;
  }

  return { open: open.minutes, close: closeMinutes };
}

function formatClockMinutes(totalMinutes: number): string {
  const minutesInDay = ((totalMinutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(minutesInDay / 60);
  const minute = minutesInDay % 60;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

function formatHoursRange(hours: HoursRange | null | undefined): string {
  const range = normalizeHoursRange(hours);
  if (!range) return 'Closed';
  return `${formatClockMinutes(range.open)} - ${formatClockMinutes(range.close)}`;
}

function isOpenNow(hoursJson: HoursByWeekday): boolean {
  const now = new Date();
  const key = WEEKDAY_KEYS[now.getDay()];
  const range = normalizeHoursRange(hoursJson[key]);
  if (!range) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  if (current >= range.open && current < range.close) return true;
  return range.close > 1440 && current + 1440 < range.close;
}

function openMaps(address: string, city: string) {
  const query = encodeURIComponent(`${address}, ${city}`);
  Linking.openURL(`https://maps.apple.com/?q=${query}`).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`)
  );
}

function mergeCatalogWithMockFallback(restaurants: typeof mockRestaurants) {
  const seen = new Set(restaurants.map((restaurant) => restaurant.id));
  return [
    ...restaurants,
    ...mockRestaurants.filter((restaurant) => !seen.has(restaurant.id)),
  ];
}

type DisplayMenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  photoUrl: string | null;
  isAvailable: boolean;
  sortOrder: number;
};

function displayMenuItemFromPublic(
  item: PublicMenuItem,
  categoryNameById: Map<string, string>,
): DisplayMenuItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category_id
      ? categoryNameById.get(item.category_id) ?? item.category ?? 'Menu'
      : item.category ?? 'Menu',
    photoUrl: item.photo_url,
    isAvailable: item.is_available !== false,
    sortOrder: item.sort_order ?? 0,
  };
}

function displayMenuItemFromMock(item: MockMenuItem): DisplayMenuItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category || 'Menu',
    photoUrl: item.photoUrl?.trim() || null,
    isAvailable: item.isAvailable,
    sortOrder: item.preparationTimeMinutes,
  };
}

function groupDisplayMenuItems(items: DisplayMenuItem[]) {
  return items.reduce<Record<string, DisplayMenuItem[]>>((groups, item) => {
    groups[item.category] = groups[item.category] ?? [];
    groups[item.category].push(item);
    return groups;
  }, {});
}

const useStyles = createStyles((c) => ({
  root: {
    flex: 1,
    backgroundColor: c.bgBase,
  },
  previewBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: c.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 10,
    paddingHorizontal: spacing.lg,
  },
  previewBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroWrap: {
    position: 'relative',
  },
  hero: {
    width: '100%',
    height: 250,
    backgroundColor: c.bgElevated,
  },
  backBtn: {
    position: 'absolute',
    left: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChevron: {
    fontSize: 28,
    lineHeight: 30,
    color: c.textPrimary,
    fontWeight: '400',
  },
  starGlyph: {
    fontSize: 15,
    lineHeight: 18,
    color: c.gold,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  h1: {
    ...typography.h1,
    color: c.textPrimary,
    marginBottom: spacing.md,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  ratingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    ...typography.body,
    color: c.textSecondary,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: c.gold,
    marginLeft: spacing.sm,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  addressBody: { flex: 1, gap: 2 },
  address: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '500',
  },
  addressDirections: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '600',
  },

  // Section wrapper
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeading: {
    ...typography.h3,
    color: c.textPrimary,
    marginBottom: spacing.sm,
  },
  bodyText: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 22,
  },
  expandLink: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },

  // Vibe chips
  vibeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  vibeChip: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    backgroundColor: c.bgSurface,
  },
  vibeChipText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    fontWeight: '500',
  },

  // Hours
  hoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  openDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  openLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  todayHours: {
    ...typography.body,
    color: c.textSecondary,
    marginBottom: spacing.xs,
  },
  hoursGrid: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  hoursRowToday: {
    backgroundColor: 'rgba(201,168,76,0.08)',
  },
  hoursDay: {
    ...typography.body,
    color: c.textMuted,
    fontWeight: '500',
    width: 40,
  },
  hoursDayToday: {
    color: c.gold,
    fontWeight: '700',
  },
  hoursTime: {
    ...typography.body,
    color: c.textSecondary,
  },
  hoursTimeToday: {
    color: c.textPrimary,
    fontWeight: '600',
  },
  menuGroup: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  menuCategory: {
    ...typography.label,
    color: c.gold,
    marginBottom: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    padding: spacing.sm,
    ...shadows.card,
  },
  menuPhoto: {
    width: 86,
    height: 86,
    borderRadius: borderRadius.md,
    backgroundColor: c.bgElevated,
  },
  menuPhotoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBody: {
    flex: 1,
    minWidth: 0,
  },
  menuName: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '600',
  },
  menuDescription: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: 3,
    lineHeight: 17,
  },
  menuPrice: {
    ...typography.body,
    color: c.gold,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  menuUnavailable: {
    ...typography.bodySmall,
    color: c.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  menuLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  menuEmpty: {
    ...typography.body,
    color: c.textMuted,
    marginBottom: spacing.lg,
  },
  menuTabs: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  menuTab: {
    minHeight: 36,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  menuTabActive: {
    borderColor: c.gold,
    backgroundColor: c.gold,
  },
  menuTabText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    fontWeight: '700',
  },
  menuTabTextActive: {
    color: '#000000',
  },
  photoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '700',
    color: c.gold,
  },
  photoSubtitle: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginBottom: spacing.sm,
  },
  photoStrip: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  photoThumb: {
    flex: 1,
    height: 90,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgElevated,
    overflow: 'hidden',
  },
  photoEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 90,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(201, 168, 76, 0.45)',
    backgroundColor: 'rgba(201, 168, 76, 0.06)',
    paddingHorizontal: spacing.md,
  },
  photoEmptyText: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: c.bgBase,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  errorTitle: {
    ...typography.h3,
    color: c.textSecondary,
    textAlign: 'center',
  },
}));

export default function RestaurantDetailScreen() {
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const [selectedMenuTab, setSelectedMenuTab] = useState(MENU_ALL_TAB);
  const { id, preview } = useLocalSearchParams<{ id: string; preview?: string }>();
  const restaurantId = Array.isArray(id) ? id[0] : id;
  const isPreview = preview === '1';
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items: ownerMenuItems } = useMenu();
  const [catalog, setCatalog] = useState(mockRestaurants);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    loadRestaurantsForDiscover()
      .then(({ list }) => {
        if (!cancelled) setCatalog(mergeCatalogWithMockFallback(list));
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const restaurant = useMemo(
    () => catalog.find((r) => r.id === restaurantId || r.slug === restaurantId),
    [catalog, restaurantId],
  );
  const { categories: menuCategories } = usePublicMenuCategories(isPreview ? null : restaurant?.id);
  const { items: publicMenuItems, loading: menuLoading } = usePublicMenuItems(
    isPreview ? null : restaurant?.id,
  );
  const categoryNameById = useMemo(
    () => new Map(menuCategories.map((category) => [category.id, category.name])),
    [menuCategories],
  );

  const menuItems = useMemo<DisplayMenuItem[]>(() => {
    if (isPreview) {
      return ownerMenuItems
        .map(displayMenuItemFromMock)
        .sort((a, b) => a.category.localeCompare(b.category) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    }

    if (publicMenuItems.length) {
      return publicMenuItems
        .map((item) => displayMenuItemFromPublic(item, categoryNameById))
        .sort((a, b) => a.category.localeCompare(b.category) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    }

    if (!restaurant?.id?.startsWith('r')) return [];

    return mockMenuItems
      .filter((item) => item.restaurantId === restaurant.id)
      .map(displayMenuItemFromMock)
      .sort((a, b) => a.category.localeCompare(b.category) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [categoryNameById, isPreview, ownerMenuItems, publicMenuItems, restaurant?.id]);

  const menuCategoryTabs = useMemo(
    () => Array.from(new Set(menuItems.map((item) => item.category))),
    [menuItems],
  );
  const visibleMenuItems = useMemo(
    () => selectedMenuTab === MENU_ALL_TAB
      ? menuItems
      : menuItems.filter((item) => item.category === selectedMenuTab),
    [menuItems, selectedMenuTab],
  );
  const visibleGroupedMenuItems = useMemo(
    () => groupDisplayMenuItems(visibleMenuItems),
    [visibleMenuItems],
  );

  useEffect(() => {
    if (selectedMenuTab !== MENU_ALL_TAB && !menuCategoryTabs.includes(selectedMenuTab)) {
      setSelectedMenuTab(MENU_ALL_TAB);
    }
  }, [menuCategoryTabs, selectedMenuTab]);

  const todayKey = WEEKDAY_KEYS[new Date().getDay()];
  const todayHours = restaurant?.hoursJson[todayKey];

  if (!restaurant && catalogLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.centered}>
          <ActivityIndicator color={c.gold} />
        </View>
      </ScreenWrapper>
    );
  }

  if (!restaurant) {
    return (
      <ScreenWrapper>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>{t('discover.notFound')}</Text>
          <Button title={t('common.back')} onPress={() => router.back()} variant="outlined" />
        </View>
      </ScreenWrapper>
    );
  }

  const currency = restaurant.currency.toLowerCase();

  return (
    <View style={styles.root}>
      {isPreview && (
        <Pressable
          onPress={() => router.back()}
          style={[styles.previewBanner, { paddingTop: insets.top + 10 }]}
          accessibilityRole="button"
          accessibilityLabel="Exit preview"
        >
          <Ionicons name="eye-outline" size={15} color="#000" />
          <Text style={styles.previewBannerText}>Previewing as a guest · Tap to exit</Text>
        </Pressable>
      )}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 160, paddingTop: isPreview ? 44 : 0 }]}
      >
        <View style={styles.heroWrap}>
          <Image source={{ uri: restaurant.coverPhotoUrl }} style={styles.hero} />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={[styles.backBtn, { top: insets.top + spacing.sm }]}
            hitSlop={12}
          >
            <Text style={styles.backChevron} accessible={false}>
              ←
            </Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={styles.h1}>{restaurant.name}</Text>
          <View style={styles.badgesRow}>
            <Badge label={restaurant.cuisineType} variant="gold" />
            <View style={styles.ratingBlock}>
              <Text style={styles.starGlyph} accessible={false}>
                ★
              </Text>
              <Text style={styles.ratingText}>
                {restaurant.avgRating.toFixed(1)} · {t('discover.reviewsCount', { count: restaurant.totalReviews })}
              </Text>
            </View>
          </View>

          {/* Address — tappable, opens Maps */}
          <Pressable
            onPress={() => openMaps(restaurant.address, restaurant.city)}
            style={({ pressed }) => [styles.addressRow, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="location-sharp" size={16} color={c.gold} style={{ marginTop: 1 }} />
            <View style={styles.addressBody}>
              <Text style={styles.address}>
                {restaurant.address}, {restaurant.city}, {restaurant.province}
              </Text>
              <Text style={styles.addressDirections}>Get directions →</Text>
            </View>
          </Pressable>

          {/* About — collapsible with vibe chips */}
          <View style={styles.section}>
            <Text
              style={styles.bodyText}
              numberOfLines={aboutExpanded ? undefined : 3}
            >
              {restaurant.description}
            </Text>
            {restaurant.description.length > 100 && (
              <Pressable onPress={() => setAboutExpanded((v) => !v)} hitSlop={8}>
                <Text style={styles.expandLink}>{aboutExpanded ? 'Show less' : 'Read more'}</Text>
              </Pressable>
            )}
            <View style={styles.vibeRow}>
              {restaurant.ambiance ? (
                <View style={styles.vibeChip}>
                  <Text style={styles.vibeChipText}>{restaurant.ambiance}</Text>
                </View>
              ) : null}
              {restaurant.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={styles.vibeChip}>
                  <Text style={styles.vibeChipText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Hours — open/closed status + collapsible full week */}
          <View style={styles.section}>
            <View style={styles.hoursHeader}>
              <Text style={styles.sectionHeading}>{t('restaurant.hours')}</Text>
              <View style={styles.openBadge}>
                <View style={[styles.openDot, { backgroundColor: isOpenNow(restaurant.hoursJson) ? c.success : c.danger }]} />
                <Text style={[styles.openLabel, { color: isOpenNow(restaurant.hoursJson) ? c.success : c.danger }]}>
                  {isOpenNow(restaurant.hoursJson) ? 'Open now' : 'Closed'}
                </Text>
              </View>
            </View>
            <Text style={styles.todayHours}>
              Today: {formatHoursRange(todayHours)}
            </Text>
            {hoursExpanded && (
              <View style={styles.hoursGrid}>
                {WEEKDAY_KEYS.map((key, i) => {
                  const h = restaurant.hoursJson[key];
                  const isToday = i === new Date().getDay();
                  return (
                    <View key={key} style={[styles.hoursRow, isToday && styles.hoursRowToday]}>
                      <Text style={[styles.hoursDay, isToday && styles.hoursDayToday]}>
                        {WEEKDAY_SHORT[i]}
                      </Text>
                      <Text style={[styles.hoursTime, isToday && styles.hoursTimeToday]}>
                        {formatHoursRange(h)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
            <Pressable onPress={() => setHoursExpanded((v) => !v)} hitSlop={8} style={styles.expandBtn}>
              <Text style={styles.expandLink}>{hoursExpanded ? 'Hide hours' : 'See all hours'}</Text>
              <Ionicons name={hoursExpanded ? 'chevron-up' : 'chevron-down'} size={13} color={c.gold} />
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>{t('restaurant.menu')}</Text>
            {menuLoading ? (
              <View style={styles.menuLoading}>
                <ActivityIndicator color={c.gold} />
                <Text style={styles.bodyText}>Loading menu</Text>
              </View>
            ) : menuItems.length ? (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.menuTabs}
                >
                  {[
                    { key: MENU_ALL_TAB, label: 'All' },
                    ...menuCategoryTabs.map((category) => ({ key: category, label: category })),
                  ].map((tab) => {
                    const selected = selectedMenuTab === tab.key;
                    return (
                      <Pressable
                        key={tab.key}
                        accessibilityRole="button"
                        accessibilityLabel={`Show ${tab.label} menu items`}
                        onPress={() => setSelectedMenuTab(tab.key)}
                        style={({ pressed }) => [
                          styles.menuTab,
                          selected && styles.menuTabActive,
                          pressed && { opacity: 0.82 },
                        ]}
                      >
                        <Text style={[styles.menuTabText, selected && styles.menuTabTextActive]}>
                          {tab.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {Object.entries(visibleGroupedMenuItems).map(([category, items]) => (
                  <View key={category} style={styles.menuGroup}>
                    <Text style={styles.menuCategory}>{category}</Text>
                    {items.map((item) => {
                      const imageUrl = item.photoUrl?.trim();
                      return (
                        <View key={item.id} style={styles.menuItem}>
                          {imageUrl ? (
                            <Image source={{ uri: imageUrl }} style={styles.menuPhoto} resizeMode="cover" />
                          ) : (
                            <View style={[styles.menuPhoto, styles.menuPhotoPlaceholder]}>
                              <Ionicons name="restaurant-outline" size={24} color={c.textMuted} />
                            </View>
                          )}
                          <View style={styles.menuBody}>
                            <Text style={styles.menuName} numberOfLines={2}>{item.name}</Text>
                            {item.description ? (
                              <Text style={styles.menuDescription} numberOfLines={3}>{item.description}</Text>
                            ) : null}
                            <Text style={styles.menuPrice}>{formatCurrency(item.price, currency)}</Text>
                            {!item.isAvailable ? (
                              <Text style={styles.menuUnavailable}>Currently unavailable</Text>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </>
            ) : (
              <Text style={styles.menuEmpty}>This restaurant has not published a menu yet.</Text>
            )}
          </View>

          {(() => {
            const allSnapPhotos = listSnapPostsByRestaurant(restaurant.id);
            const snapPhotos = allSnapPhotos.slice(0, 3);
            const isEmpty = snapPhotos.length === 0;
            return (
              <View style={{ marginTop: spacing.xl }}>
                <View style={styles.photoSectionHeader}>
                  <Text style={styles.sectionHeading}>Photos</Text>
                  {/* Hide "See all" when empty — there's nothing to navigate to. */}
                  {!isEmpty ? (
                    <Pressable
                      hitSlop={8}
                      onPress={() => router.push(`/(customer)/discover/snaps/${restaurant.id}`)}
                    >
                      <Text style={styles.seeAll}>See all</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={styles.photoSubtitle}>See what people are eating here</Text>

                {isEmpty ? (
                  // Empty state — keeps the section discoverable and lets the
                  // first diner kick things off straight from the restaurant page.
                  <Pressable
                    onPress={() =>
                      router.push(
                        `/(customer)/discover/post-review/camera?restaurantId=${restaurant.id}`,
                      )
                    }
                    style={({ pressed }) => [
                      styles.photoEmpty,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Ionicons name="camera-outline" size={22} color={c.gold} />
                    <Text style={styles.photoEmptyText}>
                      No photos yet — be the first to share one
                    </Text>
                  </Pressable>
                ) : (
                  <View style={styles.photoStrip}>
                    {snapPhotos.map((snap) => (
                      <Pressable
                        key={snap.id}
                        style={styles.photoThumb}
                        onPress={() => router.push(`/(customer)/discover/snaps/detail/${snap.id}`)}
                      >
                        <Image
                          source={{ uri: snap.image }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            );
          })()}

        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Button
          title={t('restaurant.bookTable')}
          onPress={() => router.push(`/booking/${restaurant.id}/step2-time`)}
        />
      </View>
    </View>
  );
}
