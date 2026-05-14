import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, ScrollView, Image, Pressable, Linking, useWindowDimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Badge, ScreenWrapper } from '@/components/ui';
import { StoryFilterFrame } from '@/components/storyFilters/StoryFilterFrame';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { mockRestaurants as DEMO_RESTAURANTS } from '@/lib/mock/restaurants';
import { mockMenuItems as DEMO_MENU_ITEMS, type MenuItem as MockMenuItem } from '@/lib/mock/menuItems';
import { isDemoModeEnabled } from '@/lib/config/demoMode';

const mockRestaurants: typeof DEMO_RESTAURANTS = isDemoModeEnabled() ? DEMO_RESTAURANTS : [];
const mockMenuItems: typeof DEMO_MENU_ITEMS = isDemoModeEnabled() ? DEMO_MENU_ITEMS : [];
import { useMenu } from '@/lib/context/MenuContext';
import { loadRestaurantsForDiscover } from '@/lib/data/restaurantCatalog';
import {
  fetchRestaurantMenu,
  type MenuCategory as RealMenuCategory,
  type MenuItem as RealMenuItem,
} from '@/lib/menu/getRestaurantMenu';
import {
  fetchRestaurantPublicReviews,
  type RestaurantPublicReviewRow,
} from '@/lib/reviews/getRestaurantReviews';
import { listSnapPostsByRestaurant as DEMO_listSnapPostsByRestaurant } from '@/lib/mock/snaps';
import { listVisitPhotosByRestaurant, type VisitPhotoRow } from '@/lib/snaps/visitPhotosApi';
import type { StoryFilterId } from '@/lib/storyFilters/types';
import { STORY_FILTERS } from '@/lib/storyFilters/registry';
import { getLatestCompletedVisitForRestaurant } from '@/lib/postVisit/postTurn';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import {
  currentRestaurantWeekdayKey,
  formatHoursRange as formatRestaurantHoursRange,
  isRestaurantOpenForHours,
} from '@/lib/restaurants/hoursStatus';
import { useColors, createStyles, spacing, borderRadius, typography, shadows } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MENU_ALL_TAB = '__all__';

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
  item: RealMenuItem,
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

function summarizeDepositPolicy(
  policy: Record<string, unknown> | null | undefined,
  tiers: { min_party_size: number; amount_per_person_cents: number }[] | null | undefined,
  currency: string,
): string | null {
  const tierList = Array.isArray(tiers) ? tiers : [];
  if (tierList.length) {
    const smallest = tierList.reduce(
      (acc, t) => (t.min_party_size < acc.min_party_size ? t : acc),
      tierList[0],
    );
    if (smallest && smallest.min_party_size > 0) {
      const perPerson = (smallest.amount_per_person_cents ?? 0) / 100;
      return `Deposit applies for parties of ${smallest.min_party_size}+ (${formatCurrency(perPerson, currency)} per person).`;
    }
  }
  if (policy && typeof policy === 'object') {
    const minParty =
      typeof policy.min_party_size === 'number' ? policy.min_party_size : null;
    const amount =
      typeof policy.amount_per_person_cents === 'number'
        ? policy.amount_per_person_cents / 100
        : typeof policy.amount_per_person === 'number'
          ? policy.amount_per_person
          : null;
    if (minParty != null && amount != null) {
      return `Deposit applies for parties of ${minParty}+ (${formatCurrency(amount, currency)} per person).`;
    }
    if (typeof policy.summary === 'string' && policy.summary.trim()) {
      return policy.summary.trim();
    }
  }
  return null;
}

function formatReviewDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function renderStars(rating: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
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
  seeMenuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    width: '100%',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: borderRadius.full,
    backgroundColor: c.gold,
  },
  seeMenuBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: c.bgBase,
    letterSpacing: -0.1,
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
    borderRadius: borderRadius.md,
    backgroundColor: c.bgElevated,
    overflow: 'hidden',
  },
  showMoreBtn: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.45)',
    alignItems: 'center',
    backgroundColor: 'rgba(201,168,76,0.06)',
  },
  showMoreBtnPressed: {
    opacity: 0.85,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.gold,
    letterSpacing: 0.2,
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
  policyChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  policyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: c.bgSurface,
  },
  policyChipText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    fontWeight: '500',
  },
  policyLine: {
    ...typography.body,
    color: c.textSecondary,
    marginTop: spacing.xs,
  },
  depositSummary: {
    ...typography.body,
    color: c.textSecondary,
    marginTop: spacing.xs,
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgSurface,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewName: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '600',
  },
  reviewStars: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '700',
  },
  reviewDate: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginBottom: 4,
  },
  reviewText: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 22,
  },
  reviewsEmpty: {
    ...typography.body,
    color: c.textMuted,
  },
}));

export default function RestaurantDetailScreen() {
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const [selectedMenuTab, setSelectedMenuTab] = useState(MENU_ALL_TAB);
  const scrollViewRef = useRef<ScrollView>(null);
  const menuSectionRef = useRef<View>(null);
  const scrollToMenu = () => {
    if (!scrollViewRef.current || !menuSectionRef.current) return;
    menuSectionRef.current.measureLayout(
      // @ts-expect-error — ScrollView's underlying node is a valid target.
      scrollViewRef.current,
      (_x, y) => {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
      },
      () => {},
    );
  };
  const { id, preview } = useLocalSearchParams<{ id: string; preview?: string }>();
  const restaurantId = Array.isArray(id) ? id[0] : id;
  const isPreview = preview === '1';
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowW } = useWindowDimensions();
  const { items: ownerMenuItems } = useMenu();
  const { user, isAuthenticated } = useAuthSession();
  const [catalog, setCatalog] = useState(mockRestaurants);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [shareVisitBookingId, setShareVisitBookingId] = useState<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    setShareVisitBookingId(null);
    if (!isAuthenticated || !user?.id || !restaurant?.id) return undefined;

    getLatestCompletedVisitForRestaurant(user, restaurant.id).then((visit) => {
      if (!cancelled) setShareVisitBookingId(visit?.bookingId ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, restaurant?.id, user]);

  const [menuCategories, setMenuCategories] = useState<RealMenuCategory[]>([]);
  const [publicMenuItems, setPublicMenuItems] = useState<RealMenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [reviews, setReviews] = useState<RestaurantPublicReviewRow[]>([]);
  const [visitPhotoStrip, setVisitPhotoStrip] = useState<VisitPhotoRow[]>([]);

  useEffect(() => {
    // Preview should mirror exactly what a real diner sees, so we fetch
    // the published menu_items rows regardless of preview mode.
    const targetId = restaurant?.id ?? null;
    if (!targetId) {
      setMenuCategories([]);
      setPublicMenuItems([]);
      setMenuLoading(false);
      return;
    }
    if (isDemoModeEnabled()) {
      // Keep demo data for menu via existing mock fallback path below.
      setMenuCategories([]);
      setPublicMenuItems([]);
      setMenuLoading(false);
      return;
    }
    let active = true;
    setMenuLoading(true);
    void fetchRestaurantMenu(targetId)
      .then(({ categories, items }) => {
        if (!active) return;
        setMenuCategories(categories);
        setPublicMenuItems(items);
      })
      .catch(() => {
        if (!active) return;
        setMenuCategories([]);
        setPublicMenuItems([]);
      })
      .finally(() => {
        if (active) setMenuLoading(false);
      });
    return () => {
      active = false;
    };
  }, [restaurant?.id]);

  useFocusEffect(
    // Refetch on every focus so deletes from My Reviews propagate here.
    useCallback(() => {
      const targetId = restaurant?.id ?? null;
      if (!targetId) {
        setReviews([]);
        return;
      }
      if (isDemoModeEnabled()) {
        setReviews([]);
        return;
      }
      let active = true;
      void fetchRestaurantPublicReviews(targetId, 12)
        .then((rows) => {
          if (active) setReviews(rows);
        })
        .catch(() => {
          if (active) setReviews([]);
        });
      return () => {
        active = false;
      };
    }, [restaurant?.id]),
  );

  const categoryNameById = useMemo(
    () => new Map(menuCategories.map((category) => [category.id, category.name])),
    [menuCategories],
  );

  const menuItems = useMemo<DisplayMenuItem[]>(() => {
    // Preview shows the same published menu_items the diner sees, so the
    // owner can verify their changes after Save instead of looking at a
    // local draft that may not be persisted.
    if (publicMenuItems.length) {
      return publicMenuItems
        .map((item) => displayMenuItemFromPublic(item, categoryNameById))
        .sort((a, b) => a.category.localeCompare(b.category) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    }

    if (isPreview) {
      // Demo / unseeded fallback: show the owner's local menu draft so
      // the preview isn't empty in demo mode.
      return ownerMenuItems
        .map(displayMenuItemFromMock)
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

  useFocusEffect(
    // Refetch on focus so deletes from My Reviews propagate here.
    useCallback(() => {
      if (isDemoModeEnabled() || !restaurant?.id) return;
      let cancelled = false;
      listVisitPhotosByRestaurant(restaurant.id, 3)
        .then((rows) => { if (!cancelled) setVisitPhotoStrip(rows); })
        .catch(() => {});
      return () => { cancelled = true; };
    }, [restaurant?.id]),
  );

  const todayKey = currentRestaurantWeekdayKey();
  const todayHours = restaurant?.hoursJson[todayKey];
  const openNow = restaurant ? isRestaurantOpenForHours(restaurant.hoursJson) : false;

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
  const photoThumbWidth = Math.max(1, Math.floor((windowW - spacing.lg * 2 - spacing.sm * 2) / 3));

  const depositSummary = summarizeDepositPolicy(
    restaurant.depositPolicyJson,
    restaurant.depositTiers,
    currency,
  );
  const hasPolicyInfo =
    restaurant.cancellationHours != null ||
    restaurant.noShowFee != null ||
    restaurant.acceptsWalkins != null ||
    restaurant.hasBar != null;

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
        ref={scrollViewRef}
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
                {restaurant.avgRating != null
                  ? `${restaurant.avgRating.toFixed(1)} · ${t('discover.reviewsCount', { count: restaurant.totalReviews })}`
                  : t('discover.noRatingYet')}
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
            <Pressable
              onPress={() => {
                if (!restaurant?.id) return;
                const path = `/(customer)/discover/menu/${restaurant.id}${isPreview ? '?preview=1' : ''}`;
                router.push(path as never);
              }}
              accessibilityRole="button"
              accessibilityLabel="See the menu"
              style={({ pressed }) => [styles.seeMenuBtn, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="restaurant-outline" size={16} color={c.bgBase} />
              <Text style={styles.seeMenuBtnText}>See menu</Text>
              <Ionicons name="chevron-forward" size={14} color={c.bgBase} />
            </Pressable>
          </View>

          {/* Hours — open/closed status + collapsible full week */}
          <View style={styles.section}>
            <View style={styles.hoursHeader}>
              <Text style={styles.sectionHeading}>{t('restaurant.hours')}</Text>
              <View style={styles.openBadge}>
                <View style={[styles.openDot, { backgroundColor: openNow ? c.success : c.danger }]} />
                <Text style={[styles.openLabel, { color: openNow ? c.success : c.danger }]}>
                  {openNow ? 'Open now' : 'Closed'}
                </Text>
              </View>
            </View>
            <Text style={styles.todayHours}>
              Today: {formatRestaurantHoursRange(todayHours)}
            </Text>
            {hoursExpanded && (
              <View style={styles.hoursGrid}>
                {WEEKDAY_KEYS.map((key, i) => {
                  const h = restaurant.hoursJson[key];
                  const isToday = key === todayKey;
                  return (
                    <View key={key} style={[styles.hoursRow, isToday && styles.hoursRowToday]}>
                      <Text style={[styles.hoursDay, isToday && styles.hoursDayToday]}>
                        {WEEKDAY_SHORT[i]}
                      </Text>
                      <Text style={[styles.hoursTime, isToday && styles.hoursTimeToday]}>
                        {formatRestaurantHoursRange(h)}
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

          {(hasPolicyInfo || depositSummary) ? (
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Policies</Text>
              {restaurant.cancellationHours != null ? (
                <Text style={styles.policyLine}>
                  Cancel at least {restaurant.cancellationHours} {restaurant.cancellationHours === 1 ? 'hour' : 'hours'} ahead to avoid a fee.
                </Text>
              ) : null}
              {restaurant.noShowFee != null && restaurant.noShowFee > 0 ? (
                <Text style={styles.policyLine}>
                  No-show fee: {formatCurrency(restaurant.noShowFee, currency)}.
                </Text>
              ) : null}
              {depositSummary ? (
                <Text style={styles.depositSummary}>{depositSummary}</Text>
              ) : null}
              {(restaurant.acceptsWalkins != null || restaurant.hasBar != null) ? (
                <View style={styles.policyChipsRow}>
                  {restaurant.acceptsWalkins ? (
                    <View style={styles.policyChip}>
                      <Ionicons name="walk-outline" size={14} color={c.gold} />
                      <Text style={styles.policyChipText}>Walk-ins welcome</Text>
                    </View>
                  ) : null}
                  {restaurant.hasBar ? (
                    <View style={styles.policyChip}>
                      <Ionicons name="wine-outline" size={14} color={c.gold} />
                      <Text style={styles.policyChipText}>Bar seating</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Reviews</Text>
            {reviews.length ? (
              reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewName} numberOfLines={1}>
                      {review.reviewer_name?.trim() || 'Guest'}
                    </Text>
                    <Text style={styles.reviewStars} accessible={false}>
                      {renderStars(review.rating)}
                    </Text>
                  </View>
                  {review.created_at ? (
                    <Text style={styles.reviewDate}>{formatReviewDate(review.created_at)}</Text>
                  ) : null}
                  {review.review_text ? (
                    <Text style={styles.reviewText}>{review.review_text}</Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={styles.reviewsEmpty}>No reviews yet — be the first to share your visit.</Text>
            )}
          </View>

          {(() => {
            const demoPhotos = isDemoModeEnabled()
              ? DEMO_listSnapPostsByRestaurant(restaurant.id).slice(0, 3)
              : [];
            const isEmpty = isDemoModeEnabled()
              ? demoPhotos.length === 0
              : visitPhotoStrip.length === 0;
            return (
              <View style={{ marginTop: spacing.xl }}>
                <View style={styles.photoSectionHeader}>
                  <Text style={styles.sectionHeading}>Photos</Text>
                </View>
                <Text style={styles.photoSubtitle}>See what people are eating here</Text>

                {isEmpty ? (
                  shareVisitBookingId ? (
                    <Pressable
                      onPress={() =>
                        router.push(
                          `/(customer)/discover/post-review/camera?restaurantId=${restaurant.id}&bookingId=${encodeURIComponent(shareVisitBookingId)}`,
                        )
                      }
                      style={({ pressed }) => [
                        styles.photoEmpty,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Ionicons name="camera-outline" size={22} color={c.gold} />
                      <Text style={styles.photoEmptyText}>
                        No photos yet — share one from your visit
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={styles.photoEmpty}>
                      <Ionicons name="camera-outline" size={22} color={c.textMuted} />
                      <Text style={[styles.photoEmptyText, { color: c.textMuted }]}>
                        Photos from completed visits will appear here.
                      </Text>
                    </View>
                  )
                ) : isDemoModeEnabled() ? (
                  <>
                    <View style={styles.photoStrip}>
                      {demoPhotos.map((snap) => (
                        <Pressable
                          key={snap.id}
                          style={[styles.photoThumb, { width: photoThumbWidth, height: photoThumbWidth }]}
                          onPress={() => router.push(`/(customer)/discover/snaps/detail/${snap.id}`)}
                        >
                          {snap.storyFilterId ? (
                            <StoryFilterFrame
                              filterId={snap.storyFilterId}
                              width={photoThumbWidth}
                              height={photoThumbWidth}
                              capturedAt={snap.storyFilterCapturedAt}
                              restaurantName={restaurant.name}
                              city={restaurant.city}
                              area={restaurant.area}
                              mediaSlot={
                                <ExpoImage
                                  source={{ uri: snap.image }}
                                  style={{ width: '100%', height: '100%' }}
                                  contentFit="cover"
                                  contentPosition="bottom"
                                />
                              }
                            />
                          ) : (
                            <ExpoImage
                              source={{ uri: snap.image }}
                              style={{ width: '100%', height: '100%' }}
                              contentFit="cover"
                              contentPosition="bottom"
                            />
                          )}
                        </Pressable>
                      ))}
                    </View>
                    <Pressable
                      onPress={() => router.push(`/(customer)/discover/snaps/${restaurant.id}`)}
                      style={({ pressed }) => [
                        styles.showMoreBtn,
                        pressed && styles.showMoreBtnPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Show more photos"
                    >
                      <Text style={styles.showMoreText}>Show more</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <View style={styles.photoStrip}>
                      {visitPhotoStrip.map((photo) => {
                        const validFilter = STORY_FILTERS.some((f) => f.id === photo.story_filter_id)
                          ? (photo.story_filter_id as StoryFilterId)
                          : undefined;
                        return (
                          <Pressable
                            key={photo.id}
                            style={[styles.photoThumb, { width: photoThumbWidth, height: photoThumbWidth }]}
                            onPress={() => router.push(`/(customer)/discover/snaps/detail/${photo.id}?restaurantId=${restaurant.id}`)}
                          >
                            {validFilter ? (
                              <StoryFilterFrame
                                filterId={validFilter}
                                width={photoThumbWidth}
                                height={photoThumbWidth}
                                capturedAt={photo.story_filter_captured_at ?? undefined}
                                restaurantName={restaurant.name}
                                city={restaurant.city}
                                area={restaurant.area}
                                mediaSlot={
                                  <ExpoImage
                                    source={{ uri: photo.image_url }}
                                    style={{ width: '100%', height: '100%' }}
                                    contentFit="cover"
                                    contentPosition="bottom"
                                  />
                                }
                              />
                            ) : (
                              <ExpoImage
                                source={{ uri: photo.image_url }}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="cover"
                                contentPosition="bottom"
                              />
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                    <Pressable
                      onPress={() => router.push(`/(customer)/discover/snaps/${restaurant.id}`)}
                      style={({ pressed }) => [
                        styles.showMoreBtn,
                        pressed && styles.showMoreBtnPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Show more photos"
                    >
                      <Text style={styles.showMoreText}>Show more</Text>
                    </Pressable>
                  </>
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
