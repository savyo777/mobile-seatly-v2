import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ImageBackground,
  Platform,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter, Href, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  mockReservations,
  type Reservation,
  cancelReservationByIdAsync,
  getMockReservationsVersion,
} from '@/lib/mock/reservations';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { fetchMyBookingItems, type MyBookingItem } from '@/lib/booking/myReservations';
import {
  confirmDepositStub,
  prepareDeposit,
  type DepositStatus,
} from '@/lib/booking/publicBookingApi';
import { getSupabase } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';

type SegmentKey = 'upcoming' | 'past' | 'cancelled';

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
  depositAmountCents?: number | null;
  depositStatus?: DepositStatus | null;
  cancellationReason?: string | null;
  preorderOrderId?: string | null;
}

const OCCASION_ICONS: Record<string, string> = {
  'Date Night': '🕯️',
  'Birthday': '🎂',
  'Anniversary': '💍',
  'Celebration': '🥂',
  'Business': '💼',
};

function isUpcomingItem(item: BookingItem): boolean {
  if (['completed', 'cancelled', 'no_show'].includes(item.status)) return false;
  return new Date(item.whenIso).getTime() >= Date.now();
}

function bucketOf(item: BookingItem): SegmentKey | null {
  if (item.status === 'no_show') return null;
  if (item.status === 'cancelled') return 'cancelled';
  if (isUpcomingItem(item)) return 'upcoming';
  return 'past';
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

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },
  list: { paddingHorizontal: spacing.md, flexGrow: 1 },

  // Header
  header: { paddingTop: spacing.lg, marginBottom: spacing.xl },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.lg },
  title: { fontSize: 30, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.5 },
  badge: {
    backgroundColor: c.gold,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: 12, fontWeight: '800', color: c.bgBase },

  // Tabs
  tabs: {
    flexDirection: 'row',
    gap: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  tab: { paddingBottom: 10 },
  tabText: { fontSize: 15, fontWeight: '600', color: c.textMuted },
  tabTextActive: { color: c.textPrimary, fontWeight: '700' },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: c.gold,
  },

  // Card
  card: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201,162,74,0.22)',
    backgroundColor: c.bgSurface,
  },
  cardPast: { borderColor: c.border },
  cardPressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },

  // Matching gold rails for upcoming (no directional shadow — keeps left and right identical)
  edgeAccent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: c.gold,
    zIndex: 1,
  },
  edgeAccentLeft: {
    left: 0,
  },
  edgeAccentRight: {
    right: 0,
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
    backgroundColor: c.gold,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: c.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  confirmedBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: c.bgBase,
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
    color: c.textPrimary,
    letterSpacing: -0.1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  // The date can shrink/ellipsize when space is tight.
  dateRowDate: {
    flexShrink: 1,
    minWidth: 0,
  },
  // The time NEVER shrinks — keeps "11:00 AM" intact on one line.
  dateRowTime: {
    flexShrink: 0,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textMuted,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  codeRowText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textMuted,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    letterSpacing: 0.5,
  },
  depositBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  depositBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  cancelReasonText: {
    fontSize: 12,
    color: c.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  dimPrimary: { color: c.textSecondary },
  dimSecondary: { color: c.textMuted },

  // Action row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  bookAgainBtn: {
    paddingVertical: 7,
    paddingHorizontal: 18,
    backgroundColor: c.gold,
    borderRadius: borderRadius.full,
    shadowColor: c.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  bookAgainText: { fontSize: 13, fontWeight: '800', color: c.bgBase },
  outlineBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(201,162,74,0.4)',
  },
  outlineBtnText: { fontSize: 12, fontWeight: '600', color: c.goldLight },
  cancelBookingBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.45)',
  },
  cancelBookingText: { fontSize: 12, fontWeight: '700', color: c.danger },
  detailsLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  detailsLinkText: { fontSize: 13, fontWeight: '500', color: c.textMuted },

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
    backgroundColor: c.bgElevated,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: c.textPrimary, textAlign: 'center' },
  emptyBody: { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 20 },
  emptyCta: {
    marginTop: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: c.gold,
  },
  emptyCtaText: { fontSize: 14, fontWeight: '700', color: c.gold },
}));

export default function ActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const [segment, setSegment] = useState<SegmentKey>('upcoming');
  const [refreshKey, refreshList] = useReducer((n: number) => n + 1, 0);
  const seenReservationsVersionRef = useRef(getMockReservationsVersion());
  const [liveItems, setLiveItems] = useState<MyBookingItem[]>([]);
  const [liveLoaded, setLiveLoaded] = useState(false);

  const reloadLiveBookings = useCallback(async () => {
    try {
      const rows = await fetchMyBookingItems();
      setLiveItems(rows);
      setLiveLoaded(true);
    } catch {
      setLiveLoaded(false);
    }
  }, []);

  useEffect(() => {
    void reloadLiveBookings();
  }, [reloadLiveBookings]);

  useFocusEffect(useCallback(() => {
    const version = getMockReservationsVersion();
    if (version !== seenReservationsVersionRef.current) {
      seenReservationsVersionRef.current = version;
      refreshList();
    }
    void reloadLiveBookings();
  }, [reloadLiveBookings]));

  const pastStatusChip = useCallback((status: Reservation['status']): { label: string; color: string } | null => {
    if (status === 'completed') return { label: 'Completed', color: c.success };
    if (status === 'cancelled') return { label: 'Cancelled', color: c.danger };
    if (status === 'no_show') return { label: 'No Show', color: c.textMuted };
    return null;
  }, [c.success, c.danger, c.textMuted]);

  const items = useMemo<BookingItem[]>(() =>
    liveLoaded
      ? liveItems
      : isDemoModeEnabled()
        ? mockReservations
        .filter((r) => r.guestId === 'u1')
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
          depositAmountCents: null,
          depositStatus: null,
          cancellationReason: null,
          preorderOrderId: r.preorderOrderId ?? null,
        }))
        : [],
  [liveItems, liveLoaded, refreshKey]);

  const segmentItems = useMemo(() => {
    const filtered = items.filter((item) => bucketOf(item) === segment);
    return filtered.sort((a, b) => {
      const ta = new Date(a.whenIso).getTime();
      const tb = new Date(b.whenIso).getTime();
      return segment === 'upcoming' ? ta - tb : tb - ta;
    });
  }, [items, segment]);

  const upcomingCount = useMemo(
    () => items.filter(isUpcomingItem).length,
    [items],
  );

  const [payingDepositId, setPayingDepositId] = useState<string | null>(null);

  const payDeposit = useCallback(async (item: BookingItem) => {
    if (!item.depositAmountCents || item.depositAmountCents <= 0) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setPayingDepositId(item.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      const { payments } = await prepareDeposit({
        reservation_id: item.id,
        payers: [{
          email: user?.email ?? '',
          full_name: (user?.user_metadata?.full_name as string | undefined) ?? '',
          amount_cents: item.depositAmountCents,
        }],
      });
      for (const payment of payments) {
        await confirmDepositStub({ payment_id: payment.id });
      }
      await reloadLiveBookings();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not charge the deposit.';
      Alert.alert('Payment failed', message);
    } finally {
      setPayingDepositId(null);
    }
  }, [reloadLiveBookings]);

  const promptCancelBooking = useCallback((item: BookingItem) => {
    Alert.alert(
      'Cancel reservation?',
      `Cancel your booking at ${item.restaurantName}?`,
      [
        { text: 'Keep reservation', style: 'cancel' },
        {
          text: 'Cancel reservation',
          style: 'destructive',
          onPress: async () => {
            const { ok, reason } = await cancelReservationByIdAsync(item.id);
            if (!ok) {
              Alert.alert('Could not cancel', reason ?? 'Please try again.');
              return;
            }
            seenReservationsVersionRef.current = getMockReservationsVersion();
            void reloadLiveBookings();
            refreshList();
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  }, [reloadLiveBookings]);

  const renderItem = useCallback(
    ({ item }: { item: BookingItem }) => {
      const isPast = segment === 'past';
      const isCancelledTab = segment === 'cancelled';
      const isUpcomingTab = segment === 'upcoming';
      const { primary, sub } = formatDateTime(item.whenIso);
      const chip = isPast || isCancelledTab ? pastStatusChip(item.status) : null;
      const icon = item.occasion ? OCCASION_ICONS[item.occasion] : null;
      const guestLabel = `${item.partySize} ${item.partySize === 1 ? 'guest' : 'guests'}`;
      const detailLine = [guestLabel, icon ? `${icon} ${item.occasion}` : null].filter(Boolean).join('  ·  ');

      return (
        <View style={[styles.card, isPast && styles.cardPast]}>
          {/* Symmetric gold edge rails for upcoming */}
          {!isPast ? (
            <>
              <View style={[styles.edgeAccent, styles.edgeAccentLeft]} />
              <View style={[styles.edgeAccent, styles.edgeAccentRight]} />
            </>
          ) : null}

          <Pressable
            onPress={() => router.push(`/(customer)/bookings/${item.id}` as Href)}
            style={({ pressed }) => [pressed && styles.cardPressed]}
          >
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
              {/* Top row: confirmed badge (upcoming) or status chip (past/cancelled) */}
              <View style={styles.photoTopRow}>
                {isUpcomingTab ? (
                  item.depositStatus === 'pending' ? (
                    <View style={[styles.chip, { borderColor: c.warning + '66', backgroundColor: 'rgba(0,0,0,0.65)' }]}>
                      <View style={[styles.chipDot, { backgroundColor: c.warning }]} />
                      <Text style={[styles.chipText, { color: c.warning }]}>Deposit due</Text>
                    </View>
                  ) : item.depositStatus === 'failed' ? (
                    <View style={[styles.chip, { borderColor: c.danger + '66', backgroundColor: 'rgba(0,0,0,0.65)' }]}>
                      <View style={[styles.chipDot, { backgroundColor: c.danger }]} />
                      <Text style={[styles.chipText, { color: c.danger }]}>Payment failed</Text>
                    </View>
                  ) : (
                    <View style={styles.confirmedBadge}>
                      <Ionicons name="checkmark-circle" size={13} color={c.bgBase} />
                      <Text style={styles.confirmedBadgeText}>Confirmed</Text>
                    </View>
                  )
                ) : chip ? (
                  <View style={[styles.chip, { borderColor: chip.color + '66' }]}>
                    <View style={[styles.chipDot, { backgroundColor: chip.color }]} />
                    <Text style={[styles.chipText, { color: chip.color }]}>{chip.label}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.restaurantName} numberOfLines={1}>{item.restaurantName}</Text>
            </ImageBackground>
          </Pressable>

          {/* Info */}
          <View style={styles.info}>
            {/*
              Split the date and the time into two Text nodes inside a row.
              The time has flexShrink: 0 so it always renders in full — if
              there's not enough width the date truncates with ellipsis,
              never the time (the bug was "11:00" wrapping to "11:0" + "0"
              on narrow screens because RN was breaking the unbreakable
              "11:00 AM" run by character).
            */}
            <View style={styles.dateRow}>
              <Text
                style={[styles.dateText, isPast && styles.dimPrimary, styles.dateRowDate]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {primary}  ·{' '}
              </Text>
              <Text
                style={[styles.dateText, isPast && styles.dimPrimary, styles.dateRowTime]}
                numberOfLines={1}
              >
                {sub}
              </Text>
            </View>
            <Text style={[styles.detailText, isPast && styles.dimSecondary]}>{detailLine}</Text>
            {item.confirmationCode ? (
              <View style={styles.codeRow}>
                <Ionicons name="ticket-outline" size={12} color={c.textMuted} />
                <Text style={styles.codeRowText}>Code: {item.confirmationCode}</Text>
              </View>
            ) : null}
            {item.depositStatus && item.depositStatus !== 'none' ? (
              (() => {
                const depositColor =
                  item.depositStatus === 'charged'
                    ? c.success
                    : item.depositStatus === 'failed'
                      ? c.danger
                      : item.depositStatus === 'pending'
                        ? c.warning
                        : c.textMuted;
                const depositLabel =
                  item.depositStatus === 'charged'
                    ? 'Deposit paid'
                    : item.depositStatus === 'failed'
                      ? 'Deposit failed'
                      : item.depositStatus === 'pending'
                        ? 'Deposit pending'
                        : item.depositStatus === 'waived'
                          ? 'Deposit waived'
                          : 'Deposit refunded';
                return (
                  <View style={[styles.depositBadge, { borderColor: depositColor + '66', marginTop: 6 }]}>
                    <Text style={[styles.depositBadgeText, { color: depositColor }]}>{depositLabel}</Text>
                  </View>
                );
              })()
            ) : null}
            {item.status === 'cancelled' && item.cancellationReason ? (
              <Text style={styles.cancelReasonText} numberOfLines={2}>
                Reason: {item.cancellationReason}
              </Text>
            ) : null}
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
            ) : isUpcomingTab ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    promptCancelBooking(item);
                  }}
                  style={({ pressed }) => [styles.cancelBookingBtn, pressed && { opacity: 0.75 }]}
                >
                  <Text style={styles.cancelBookingText}>Cancel</Text>
                </Pressable>
                {(item.depositStatus === 'pending' || item.depositStatus === 'failed') && item.depositAmountCents ? (
                  <Pressable
                    disabled={payingDepositId === item.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      void payDeposit(item);
                    }}
                    style={({ pressed }) => [styles.bookAgainBtn, (pressed || payingDepositId === item.id) && { opacity: 0.7 }]}
                  >
                    <Text style={styles.bookAgainText}>
                      {payingDepositId === item.id
                        ? 'Charging…'
                        : item.depositStatus === 'failed'
                          ? `Retry ${formatCurrency(item.depositAmountCents / 100)}`
                          : `Pay ${formatCurrency(item.depositAmountCents / 100)}`}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => router.push(`/(customer)/discover/${item.restaurantId}` as Href)}
                    style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.outlineBtnText}>View restaurant</Text>
                  </Pressable>
                )}
              </View>
            ) : isCancelledTab ? (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(`/booking/${item.restaurantId}/step2-time` as Href);
                }}
                style={({ pressed }) => [styles.bookAgainBtn, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.bookAgainText}>Book Again</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable
              onPress={() => router.push(`/(customer)/bookings/${item.id}` as Href)}
              hitSlop={10}
              style={({ pressed }) => [styles.detailsLink, pressed && { opacity: 0.5 }]}
            >
              <Text style={styles.detailsLinkText}>Details</Text>
              <Ionicons name="chevron-forward" size={13} color={c.textMuted} />
            </Pressable>
          </View>
        </View>
      );
    },
    [c.bgBase, c.danger, c.textMuted, c.warning, pastStatusChip, payDeposit, payingDepositId, promptCancelBooking, router, segment, styles],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <FlatList
        data={segmentItems}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
        updateCellsBatchingPeriod={40}
        removeClippedSubviews={Platform.OS === 'android'}
        contentContainerStyle={[styles.list, { paddingBottom: spacing.lg }]}
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
              {(['upcoming', 'past', 'cancelled'] as SegmentKey[]).map((key) => {
                const active = segment === key;
                const label = key === 'upcoming' ? 'Upcoming' : key === 'past' ? 'Past' : 'Cancelled';
                return (
                  <Pressable
                    key={key}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSegment(key); }}
                    style={styles.tab}
                  >
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>
                      {label}
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
                name={
                  segment === 'upcoming'
                    ? 'calendar-outline'
                    : segment === 'past'
                      ? 'receipt-outline'
                      : 'close-circle-outline'
                }
                size={30}
                color={c.textMuted}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {segment === 'upcoming'
                ? 'No upcoming bookings'
                : segment === 'past'
                  ? 'No past bookings'
                  : 'No cancelled bookings'}
            </Text>
            <Text style={styles.emptyBody}>
              {segment === 'upcoming'
                ? 'Find a restaurant and reserve a table.'
                : segment === 'past'
                  ? 'Your dining history will appear here.'
                  : 'Reservations you cancel will appear here.'}
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
