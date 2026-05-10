import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Animated,
  Keyboard,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import {
  listEvents as DEMO_listEvents,
  filterEvents,
  getRestaurantForEvent as DEMO_getRestaurantForEvent,
  type DiningEvent,
  type DateFilter,
  type EventType,
} from '@/lib/mock/events';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { fetchUpcomingEvents, type EventRow } from '@/lib/events/getEvents';
import { fetchActivePromotions, type PromotionRow } from '@/lib/promotions/getPromotions';

const listEvents: typeof DEMO_listEvents = (...args) =>
  isDemoModeEnabled() ? DEMO_listEvents(...args) : [];
// `filterEvents` is a pure function over the array we pass in, safe to use
// for both real and mock event lists.
const getRestaurantForEvent: typeof DEMO_getRestaurantForEvent = (id) =>
  isDemoModeEnabled() ? DEMO_getRestaurantForEvent(id) : undefined;

const FALLBACK_EVENT_COVER =
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80';

function inferEventType(row: EventRow): EventType {
  const theme = (row.theme ?? '').toLowerCase();
  if (theme.includes('happy')) return 'happy_hour';
  if (theme.includes('promo')) return 'promotion';
  if (theme.includes('tasting') || theme.includes('omakase') || theme.includes('chef')) return 'tasting_menu';
  return 'event';
}

function buildEventDateIso(row: EventRow): string {
  if (row.date && row.start_time) return `${row.date}T${row.start_time}`;
  if (row.date) return `${row.date}T19:00:00`;
  return new Date().toISOString();
}

function buildEventEndsAtIso(row: EventRow): string {
  const endDate = row.end_date ?? row.date ?? '';
  if (endDate && row.end_time) return `${endDate}T${row.end_time}`;
  if (endDate) return `${endDate}T23:00:00`;
  return buildEventDateIso(row);
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatPromoBadge(row: PromotionRow): string | null {
  if (row.promo_type === 'bogo') return 'BOGO';
  if (typeof row.discount_value === 'number' && row.discount_value > 0) {
    if (row.discount_unit === 'percent') return `${Math.round(row.discount_value)}% off`;
    if (row.discount_unit === 'amount') return `$${row.discount_value.toFixed(0)} off`;
    return `${row.discount_value} off`;
  }
  return null;
}

function mapPromotionRowToDining(row: PromotionRow): DiningEvent {
  const today = todayIsoDate();
  // Show under "Tonight" while the promo is active (starts in the past or today)
  const startsAtDate = row.starts_at?.slice(0, 10) ?? today;
  const dateForFilter = startsAtDate <= today ? today : startsAtDate;
  const tags: string[] = [];
  const badge = formatPromoBadge(row);
  if (badge) tags.push(badge);
  if (row.promo_code) tags.push(row.promo_code);
  if (row.applies_to && row.applies_to !== 'all') tags.push(`Applies to ${row.applies_to}`);
  return {
    id: `promo:${row.id}`,
    restaurantId: row.restaurant_id,
    title: row.title,
    description: row.description ?? '',
    coverImage: row.cover_image_url || row.media_url || FALLBACK_EVENT_COVER,
    type: 'promotion',
    date: `${dateForFilter}T00:00:00`,
    endsAt: row.ends_at ?? `${dateForFilter}T23:59:59`,
    price: undefined,
    spotsLeft: undefined,
    tags,
    savedBy: [],
  };
}

function mapEventRowToDining(row: EventRow): DiningEvent {
  const capacity = typeof row.capacity === 'number' ? row.capacity : null;
  const sold = typeof row.tickets_sold === 'number' ? row.tickets_sold : 0;
  const spotsLeft = capacity !== null ? Math.max(0, capacity - sold) : undefined;
  const tags: string[] = [];
  if (row.theme) tags.push(row.theme);
  if (row.dress_code) tags.push(row.dress_code);
  if (typeof row.min_age === 'number' && row.min_age > 0) tags.push(`${row.min_age}+`);
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    title: row.name,
    description: row.description ?? '',
    coverImage: row.cover_image_url || row.media_url || FALLBACK_EVENT_COVER,
    type: inferEventType(row),
    date: buildEventDateIso(row),
    endsAt: buildEventEndsAtIso(row),
    price: typeof row.price_per_person === 'number' && row.price_per_person > 0
      ? row.price_per_person
      : undefined,
    spotsLeft,
    tags,
    savedBy: [],
  };
}
import { EventCard } from '@/components/events/EventCard';
import { EventFilterBar } from '@/components/events/EventFilterBar';

type TypeFilterKey = EventType | 'all';

function matchesQuery(event: DiningEvent, q: string): boolean {
  const lower = q.toLowerCase();
  if (event.title.toLowerCase().includes(lower)) return true;
  if (event.description.toLowerCase().includes(lower)) return true;
  if (event.tags.some((t) => t.toLowerCase().includes(lower))) return true;
  const rest = getRestaurantForEvent(event.restaurantId);
  if (rest?.name.toLowerCase().includes(lower)) return true;
  if (rest?.cuisineType.toLowerCase().includes(lower)) return true;
  return false;
}

const useStyles = createStyles((c) => ({
  root: {
    flex: 1,
    backgroundColor: c.bgBase,
  },
  list: {
    gap: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  goldDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: c.gold,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.5,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: 1,
    borderColor: 'rgba(201,162,74,0.3)',
    paddingHorizontal: spacing.sm,
    gap: 6,
    position: 'absolute',
    left: spacing.md,
    right: 56,
    bottom: spacing.md,
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: c.textPrimary,
    paddingVertical: 0,
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterWrap: {
    paddingTop: spacing.sm,
    marginBottom: spacing.md,
  },
  resultCount: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    marginTop: -spacing.xs,
  },
  resultCountText: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing['3xl'],
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: c.bgElevated,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textPrimary,
    marginTop: spacing.sm,
  },
  emptyBody: {
    fontSize: 13,
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
}));

export default function EventsScreen() {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [dateFilter, setDateFilter] = useState<DateFilter>('tonight');
  const [typeFilter, setTypeFilter] = useState<TypeFilterKey>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const inputRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const openSearch = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchOpen(true);
    Animated.spring(slideAnim, {
      toValue: 1,
      tension: 80,
      friction: 12,
      useNativeDriver: true,
    }).start(() => inputRef.current?.focus());
  }, [slideAnim]);

  const closeSearch = useCallback(() => {
    Keyboard.dismiss();
    setQuery('');
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 80,
      friction: 12,
      useNativeDriver: true,
    }).start(() => setSearchOpen(false));
  }, [slideAnim]);

  const [realEvents, setRealEvents] = useState<DiningEvent[]>([]);

  useEffect(() => {
    if (isDemoModeEnabled()) return;
    let active = true;
    void (async () => {
      try {
        const [eventRows, promoRows] = await Promise.all([
          fetchUpcomingEvents({ limit: 50 }),
          fetchActivePromotions({ limit: 50 }),
        ]);
        if (!active) return;
        const merged: DiningEvent[] = [
          ...eventRows.map(mapEventRowToDining),
          ...promoRows.map(mapPromotionRowToDining),
        ];
        setRealEvents(merged);
      } catch (err) {
        console.warn('[events] fetch failed', err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const allEvents = useMemo(
    () => (isDemoModeEnabled() ? listEvents() : realEvents),
    [realEvents],
  );

  const events = useMemo(() => {
    const filtered = filterEvents(allEvents, query ? 'all' : dateFilter, query ? 'all' : typeFilter);
    if (!query.trim()) return filtered;
    return filtered.filter((ev) => matchesQuery(ev, query));
  }, [allEvents, dateFilter, typeFilter, query]);

  const renderEvent = useCallback(
    ({ item, index }: { item: DiningEvent; index: number }) => (
      <EventCard event={item} isHero={index === 0 && dateFilter === 'tonight' && !query} />
    ),
    [dateFilter, query],
  );

  const titleOpacity = slideAnim.interpolate({ inputRange: [0, 0.4], outputRange: [1, 0], extrapolate: 'clamp' });
  const searchOpacity = slideAnim.interpolate({ inputRange: [0.4, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const searchTranslateX = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0], extrapolate: 'clamp' });

  const ListHeader = useCallback(
    () => (
      <View>
        <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
          <Animated.View style={[styles.titleBlock, { opacity: titleOpacity }]} pointerEvents={searchOpen ? 'none' : 'auto'}>
            <View style={styles.titleRow}>
              <View style={styles.goldDot} />
              <Text style={styles.label}>TORONTO</Text>
            </View>
            <Text style={styles.title}>Events</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.searchInputWrap,
              {
                opacity: searchOpacity,
                transform: [{ translateX: searchTranslateX }],
              },
            ]}
            pointerEvents={searchOpen ? 'auto' : 'none'}
          >
            <Ionicons name="search-outline" size={16} color={c.textMuted} style={styles.searchIcon} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Events, restaurants, tags…"
              placeholderTextColor={c.textMuted}
              style={styles.searchInput}
              returnKeyType="search"
              autoCorrect={false}
            />
          </Animated.View>

          <View style={styles.rightButtons}>
            {!searchOpen ? (
              <>
                <Pressable
                  onPress={openSearch}
                  style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
                  accessibilityLabel="Search events"
                >
                  <Ionicons name="search-outline" size={20} color={c.textPrimary} />
                </Pressable>
                <Pressable
                  onPress={() => router.push('/(customer)/notifications' as Href)}
                  style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
                  accessibilityLabel="Notifications"
                >
                  <Ionicons name="notifications-outline" size={20} color={c.textPrimary} />
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={closeSearch}
                style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
                accessibilityLabel="Close search"
              >
                <Ionicons name="close" size={22} color={c.textPrimary} />
              </Pressable>
            )}
          </View>
        </View>

        {!searchOpen && (
          <View style={styles.filterWrap}>
            <EventFilterBar
              dateFilter={dateFilter}
              typeFilter={typeFilter}
              onDateChange={setDateFilter}
              onTypeChange={setTypeFilter}
            />
          </View>
        )}

        {searchOpen && query.trim().length > 0 && (
          <View style={styles.resultCount}>
            <Text style={styles.resultCountText}>
              {events.length} {events.length === 1 ? 'result' : 'results'} for "{query}"
            </Text>
          </View>
        )}
      </View>
    ),
    [c, dateFilter, typeFilter, insets.top, router, searchOpen, query, events.length, openSearch, closeSearch, titleOpacity, searchOpacity, searchTranslateX, styles],
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderEvent}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
        initialNumToRender={5}
        maxToRenderPerBatch={6}
        windowSize={7}
        updateCellsBatchingPeriod={32}
        removeClippedSubviews={Platform.OS === 'android'}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, { paddingBottom: spacing.lg }]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="ticket-outline" size={32} color={c.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>
              {query ? 'No results found' : 'No events found'}
            </Text>
            <Text style={styles.emptyBody}>
              {query ? `Nothing matched "${query}". Try a different search.` : 'Try adjusting the filters or check back soon.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}
