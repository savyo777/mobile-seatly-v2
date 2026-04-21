import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ImageBackground,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter, Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { mockReservations, type Reservation } from '@/lib/mock/reservations';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { colors, spacing, borderRadius } from '@/lib/theme';

const GUEST_ID = 'g1';
type SegmentKey = 'upcoming' | 'past';

interface BookingItem {
  id: string;
  restaurantName: string;
  restaurantId: string;
  coverPhotoUrl: string;
  whenIso: string;
  status: Reservation['status'];
  partySize: number;
  occasion?: string;
  confirmationCode: string;
}

const OCCASION_ICONS: Record<string, string> = {
  'Date Night': '🕯️',
  'Birthday': '🎂',
  'Anniversary': '💍',
  'Celebration': '🥂',
  'Business': '💼',
};

function isUpcoming(r: Reservation): boolean {
  if (['completed', 'cancelled', 'no_show'].includes(r.status)) return false;
  return new Date(r.reservedAt).getTime() >= Date.now();
}

function formatDateTime(iso: string): { primary: string; sub: string } {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const time = d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true });
  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  if (isToday) return { primary: 'Tonight', sub: time };
  if (isTomorrow) return { primary: 'Tomorrow', sub: time };

  const datePart = d.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });
  return { primary: datePart, sub: time };
}

function pastStatusChip(status: Reservation['status']): { label: string; color: string } | null {
  if (status === 'completed') return { label: 'Completed', color: colors.success };
  if (status === 'cancelled') return { label: 'Cancelled', color: colors.danger };
  if (status === 'no_show') return { label: 'No Show', color: colors.textMuted };
  return null;
}

export default function ActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = useState<SegmentKey>('upcoming');

  const items = useMemo<BookingItem[]>(() =>
    mockReservations
      .filter((r) => r.guestId === GUEST_ID)
      .map((r) => ({
        id: r.id,
        restaurantName: r.restaurantName,
        restaurantId: r.restaurantId,
        coverPhotoUrl: mockRestaurants.find((rest) => rest.id === r.restaurantId)?.coverPhotoUrl ?? '',
        whenIso: r.reservedAt,
        status: r.status,
        partySize: r.partySize,
        occasion: r.occasion,
        confirmationCode: r.confirmationCode,
      })),
  []);

  const segmentItems = useMemo(() => {
    const filtered = items.filter((item) => {
      const r = mockReservations.find((r) => r.id === item.id)!;
      return segment === 'upcoming' ? isUpcoming(r) : !isUpcoming(r);
    });
    return filtered.sort((a, b) => {
      const ta = new Date(a.whenIso).getTime();
      const tb = new Date(b.whenIso).getTime();
      return segment === 'upcoming' ? ta - tb : tb - ta;
    });
  }, [items, segment]);

  const upcomingCount = useMemo(
    () => items.filter((item) => isUpcoming(mockReservations.find((r) => r.id === item.id)!)).length,
    [items],
  );

  const renderItem = ({ item }: { item: BookingItem }) => {
    const isPast = segment === 'past';
    const { primary, sub } = formatDateTime(item.whenIso);
    const chip = isPast ? pastStatusChip(item.status) : null;
    const icon = item.occasion ? OCCASION_ICONS[item.occasion] : null;
    const guestLabel = `${item.partySize} ${item.partySize === 1 ? 'guest' : 'guests'}`;
    const detailLine = [guestLabel, icon ? `${icon} ${item.occasion}` : null].filter(Boolean).join('  ·  ');

    return (
      <Pressable
        onPress={() => router.push(`/(customer)/activity/receipt/booking/${item.id}` as Href)}
        style={({ pressed }) => [styles.card, isPast && styles.cardPast, pressed && styles.cardPressed]}
      >
        {/* Gold left accent for upcoming */}
        {!isPast && <View style={styles.leftAccent} />}

        {/* Photo */}
        <ImageBackground
          source={{ uri: item.coverPhotoUrl }}
          style={styles.photo}
          imageStyle={styles.photoImg}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.72)']}
            style={StyleSheet.absoluteFill}
          />
          {/* Top row: confirmed badge (upcoming) or status chip (past) */}
          <View style={styles.photoTopRow}>
            {!isPast ? (
              <View style={styles.confirmedBadge}>
                <Ionicons name="checkmark-circle" size={13} color={colors.bgBase} />
                <Text style={styles.confirmedBadgeText}>Confirmed</Text>
              </View>
            ) : chip ? (
              <View style={[styles.chip, { borderColor: chip.color + '66' }]}>
                <View style={[styles.chipDot, { backgroundColor: chip.color }]} />
                <Text style={[styles.chipText, { color: chip.color }]}>{chip.label}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.restaurantName} numberOfLines={1}>{item.restaurantName}</Text>
        </ImageBackground>

        {/* Info */}
        <View style={styles.info}>
          <Text style={[styles.dateText, isPast && styles.dimPrimary]}>{primary}  ·  {sub}</Text>
          <Text style={[styles.detailText, isPast && styles.dimSecondary]}>{detailLine}</Text>
        </View>

        {/* Action row */}
        <View style={styles.actionRow}>
          {isPast && item.status === 'completed' ? (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push(`/booking/${item.restaurantId}/step2-time` as Href);
              }}
              style={({ pressed }) => [styles.bookAgainBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.bookAgainText}>Book Again</Text>
            </Pressable>
          ) : !isPast ? (
            <Pressable
              onPress={() => router.push(`/(customer)/discover/${item.restaurantId}` as Href)}
              style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.outlineBtnText}>View restaurant</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Pressable
            onPress={() => router.push(`/(customer)/activity/receipt/booking/${item.id}` as Href)}
            hitSlop={10}
            style={({ pressed }) => [styles.detailsLink, pressed && { opacity: 0.5 }]}
          >
            <Text style={styles.detailsLinkText}>Details</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <FlatList
        data={segmentItems}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Title */}
            <View style={styles.titleRow}>
              <Text style={styles.title}>Bookings</Text>
              {upcomingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{upcomingCount}</Text>
                </View>
              )}
            </View>

            {/* Segment */}
            <View style={styles.tabs}>
              {(['upcoming', 'past'] as SegmentKey[]).map((key) => {
                const active = segment === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSegment(key); }}
                    style={styles.tab}
                  >
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>
                      {key === 'upcoming' ? 'Upcoming' : 'Past'}
                    </Text>
                    {active && <View style={styles.tabUnderline} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={segment === 'upcoming' ? 'calendar-outline' : 'receipt-outline'}
                size={30}
                color={colors.textMuted}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {segment === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
            </Text>
            <Text style={styles.emptyBody}>
              {segment === 'upcoming'
                ? 'Find a restaurant and reserve a table.'
                : 'Your dining history will appear here.'}
            </Text>
            {segment === 'upcoming' && (
              <Pressable
                onPress={() => router.push('/(customer)/discover' as Href)}
                style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.emptyCtaText}>Explore restaurants →</Text>
              </Pressable>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  list: { paddingHorizontal: spacing.md, flexGrow: 1 },

  // Header
  header: { paddingTop: spacing.lg, marginBottom: spacing.xl },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.lg },
  title: { fontSize: 30, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  badge: {
    backgroundColor: colors.gold,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: 12, fontWeight: '800', color: colors.bgBase },

  // Tabs
  tabs: {
    flexDirection: 'row',
    gap: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tab: { paddingBottom: 10 },
  tabText: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.textPrimary, fontWeight: '700' },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.gold,
  },

  // Card
  card: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201,162,74,0.22)',
    backgroundColor: colors.bgSurface,
  },
  cardPast: { borderColor: colors.border },
  cardPressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },

  // Left accent stripe for upcoming
  leftAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.gold,
    zIndex: 1,
    shadowColor: colors.gold,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },

  // Photo
  photo: {
    height: 160,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  photoImg: { borderRadius: 0 },
  photoTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.gold,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  confirmedBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.bgBase,
    letterSpacing: 0.1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 11, fontWeight: '700' },
  restaurantName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  // Info
  info: {
    paddingHorizontal: spacing.md,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 5,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.1,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  dimPrimary: { color: colors.textSecondary },
  dimSecondary: { color: 'rgba(255,255,255,0.3)' },

  // Action row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  bookAgainBtn: {
    paddingVertical: 7,
    paddingHorizontal: 18,
    backgroundColor: colors.gold,
    borderRadius: borderRadius.full,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  bookAgainText: { fontSize: 13, fontWeight: '800', color: colors.bgBase },
  outlineBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(201,162,74,0.4)',
  },
  outlineBtnText: { fontSize: 12, fontWeight: '600', color: colors.goldLight },
  detailsLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  detailsLinkText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },

  // Empty
  empty: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 40,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  emptyBody: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  emptyCta: {
    marginTop: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  emptyCtaText: { fontSize: 14, fontWeight: '700', color: colors.gold },
});
