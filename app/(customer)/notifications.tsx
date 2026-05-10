import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter, Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors, createStyles, borderRadius, spacing } from '@/lib/theme';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { mockReservations } from '@/lib/mock/reservations';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { mockCustomer } from '@/lib/mock/users';
import { useAuthSession } from '@/lib/auth/AuthContext';
import {
  getPostTurnNotifications,
  type PostTurnRequest,
  type PostTurnRequestType,
} from '@/lib/postVisit/postTurn';
import { getSupabase } from '@/lib/supabase/client';
import { subscribeToNotifications } from '@/lib/realtime/notificationsRegistry';

// Demo mode only — see buildMockNotifications below. Real notifications
// for the signed-in user come from a Supabase query (gated above).

type AppNotifType =
  | 'booking_confirmed'
  | 'reminder_24h'
  | 'reminder_2h'
  | 'cancelled'
  | 'loyalty_milestone'
  | 'waitlist_ready'
  | 'review_request'
  | 'photo_request';

type AppNotification = {
  id: string;
  type: AppNotifType;
  title: string;
  body: string;
  timestamp: string;
  reservationId?: string;
  bookingId?: string;
  restaurantId?: string;
  postTurnType?: PostTurnRequestType;
  read: boolean;
};

type NotifConfig = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  bg: string;
  color: string;
};

const TYPE_CONFIG: Record<AppNotifType, NotifConfig> = {
  booking_confirmed: { icon: 'checkmark-circle', bg: 'rgba(72,199,142,0.12)', color: '#48C78E' },
  reminder_24h:     { icon: 'time-outline',      bg: 'rgba(201,162,74,0.12)', color: '#C9A24A' },
  reminder_2h:      { icon: 'alarm-outline',     bg: 'rgba(201,162,74,0.18)', color: '#DEB95A' },
  cancelled:        { icon: 'close-circle',      bg: 'rgba(239,68,68,0.12)',  color: '#EF4444' },
  loyalty_milestone:{ icon: 'star',              bg: 'rgba(201,162,74,0.15)', color: '#C9A24A' },
  waitlist_ready:   { icon: 'ticket',            bg: 'rgba(99,179,237,0.12)', color: '#63B3ED' },
  review_request:   { icon: 'star-outline',      bg: 'rgba(201,162,74,0.14)', color: '#C9A24A' },
  photo_request:    { icon: 'camera-outline',    bg: 'rgba(99,179,237,0.12)', color: '#63B3ED' },
};

function postTurnNotification(request: PostTurnRequest): AppNotification {
  const isReview = request.type === 'review';
  return {
    id: `post-turn-${request.type}-${request.bookingId}`,
    type: isReview ? 'review_request' : 'photo_request',
    title: isReview ? 'Review your visit' : 'Upload photos from your visit',
    body: isReview
      ? `Tell other diners how ${request.restaurantName} was.`
      : `Share photos from your visit to ${request.restaurantName}.`,
    timestamp: request.requestedAt,
    bookingId: request.bookingId,
    restaurantId: request.restaurantId,
    postTurnType: request.type,
    read: Boolean(request.inAppReadAt),
  };
}

function buildMockNotifications(): AppNotification[] {
  const myReservations = mockReservations
    .filter((r) => r.guestId === mockCustomer.id)
    .slice(0, 4);

  const notifs: AppNotification[] = [];

  myReservations.forEach((r, i) => {
    const rest = mockRestaurants.find((m) => m.id === r.restaurantId);
    const name = rest?.name ?? 'the restaurant';

    if (i === 0) {
      notifs.push({
        id: `n-remind-2h-${r.id}`,
        type: 'reminder_2h',
        title: 'Your table is in 2 hours',
        body: `Don't forget — you have a reservation at ${name} tonight. Tap to view details.`,
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        reservationId: r.id,
        read: false,
      });
    } else if (i === 1) {
      notifs.push({
        id: `n-confirm-${r.id}`,
        type: 'booking_confirmed',
        title: 'Booking confirmed',
        body: `Your reservation at ${name} is confirmed. We can't wait to see you.`,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        reservationId: r.id,
        read: false,
      });
    } else if (i === 2) {
      notifs.push({
        id: `n-remind-24h-${r.id}`,
        type: 'reminder_24h',
        title: "Reminder: tomorrow's reservation",
        body: `Your table at ${name} is tomorrow. Reply to this notification to make any changes.`,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
        reservationId: r.id,
        read: true,
      });
    } else {
      notifs.push({
        id: `n-confirm2-${r.id}`,
        type: 'booking_confirmed',
        title: 'Booking confirmed',
        body: `Your table at ${name} is all set. You're going to love it.`,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        reservationId: r.id,
        read: true,
      });
    }
  });

  notifs.push({
    id: 'n-loyalty-1',
    type: 'loyalty_milestone',
    title: 'You reached Silver tier!',
    body: "You've earned 500 loyalty points. Enjoy exclusive perks and priority booking.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    read: true,
  });

  notifs.push({
    id: 'n-waitlist-1',
    type: 'waitlist_ready',
    title: 'Spot available: Sakura Omakase',
    body: "A table has opened up for Friday evening. Book now before it's gone.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    read: true,
  });

  return notifs;
}

type SupabaseNotificationRow = {
  id: string;
  type: string | null;
  title: string | null;
  body: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean | null;
  created_at: string;
  restaurant_id: string | null;
};

function mapSupabaseType(type: string | null, data: Record<string, unknown> | null): AppNotifType {
  if (type === 'booking_confirmed' || type === 'booking_modified') return 'booking_confirmed';
  if (type === 'booking_cancelled') return 'cancelled';
  if (type === 'booking_reminder') {
    const hours = typeof data?.hours_until === 'number' ? data.hours_until : null;
    return hours != null && hours <= 3 ? 'reminder_2h' : 'reminder_24h';
  }
  if (type === 'review_request') return 'review_request';
  if (type === 'promotion_alert' || type === 'event_alert') return 'waitlist_ready';
  return 'loyalty_milestone';
}

function pickString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function mapSupabaseRow(row: SupabaseNotificationRow): AppNotification {
  const data = row.data ?? {};
  const reservationId = pickString(data['reservation_id']);
  return {
    id: row.id,
    type: mapSupabaseType(row.type, data),
    title: row.title ?? '',
    body: row.body ?? '',
    timestamp: row.created_at,
    restaurantId: row.restaurant_id ?? undefined,
    reservationId,
    read: row.is_read === true,
  };
}

async function fetchSupabaseNotifications(authUserId: string): Promise<{
  userProfileId: string | null;
  notifications: AppNotification[];
}> {
  const supabase = getSupabase();
  if (!supabase) return { userProfileId: null, notifications: [] };
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  const userProfileId = (profile as { id?: string } | null)?.id ?? null;
  if (!userProfileId) return { userProfileId: null, notifications: [] };
  const { data: rows } = await supabase
    .from('notifications')
    .select('id, type, title, body, data, is_read, created_at, restaurant_id')
    .eq('user_id', userProfileId)
    .order('created_at', { ascending: false })
    .limit(50);
  const notifications = ((rows as SupabaseNotificationRow[] | null) ?? []).map(mapSupabaseRow);
  return { userProfileId, notifications };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type BucketKey = 'today' | 'earlier';

function bucket(notifs: AppNotification[]): Record<BucketKey, AppNotification[]> {
  const today = new Date().toDateString();
  return {
    today: notifs.filter((n) => new Date(n.timestamp).toDateString() === today),
    earlier: notifs.filter((n) => new Date(n.timestamp).toDateString() !== today),
  };
}

const useStyles = createStyles((c) => ({
  root: {
    flex: 1,
    backgroundColor: c.bgBase,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.2,
  },

  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },

  bucketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  goldDot: {
    width: 5,
    height: 5,
    borderRadius: borderRadius.full,
    backgroundColor: c.gold,
  },
  bucketHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  card: {
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginLeft: 60,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    position: 'relative',
  },

  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: 2,
    backgroundColor: c.gold,
  },

  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  body: {
    flex: 1,
    gap: 3,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textSecondary,
    lineHeight: 18,
  },
  notifTitleUnread: {
    color: c.textPrimary,
    fontWeight: '700',
  },
  notifBody: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textMuted,
  },
  time: {
    fontSize: 11,
    color: c.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },

  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing['3xl'],
    gap: spacing.md,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
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

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const { user, isAuthenticated } = useAuthSession();
  const [allNotifs, setAllNotifs] = useState<AppNotification[]>(() => (isDemoModeEnabled() ? buildMockNotifications() : []));
  const [userProfileId, setUserProfileId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const buckets = bucket(allNotifs);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        const postTurn =
          isAuthenticated && user?.id
            ? (await getPostTurnNotifications(user)).map(postTurnNotification)
            : [];
        const supa =
          isAuthenticated && user?.id
            ? await fetchSupabaseNotifications(user.id)
            : { userProfileId: null, notifications: [] };
        if (!cancelled) setUserProfileId(supa.userProfileId);
        const merged = [
          ...supa.notifications,
          ...postTurn,
          ...(isDemoModeEnabled() ? buildMockNotifications() : []),
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (!cancelled) setAllNotifs(merged);
      };
      void load();
      return () => {
        cancelled = true;
      };
    }, [isAuthenticated, user, refreshTick]),
  );

  useEffect(() => {
    if (!userProfileId) return;
    return subscribeToNotifications(userProfileId, () => {
      setRefreshTick((tick) => tick + 1);
    });
  }, [userProfileId]);

  const markSupabaseRead = useCallback((id: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    void supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setAllNotifs((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
  }, []);

  const handlePress = useCallback(
    (n: AppNotification) => {
      if (n.postTurnType === 'review' && n.restaurantId && n.bookingId) {
        router.push(
          `/booking/${n.restaurantId}/review?bookingId=${encodeURIComponent(n.bookingId)}` as Href,
        );
        return;
      }
      if (n.postTurnType === 'photo' && n.restaurantId && n.bookingId) {
        router.push({
          pathname: '/(customer)/discover/post-review/camera',
          params: {
            restaurantId: n.restaurantId,
            bookingId: n.bookingId,
          },
        } as Href);
        return;
      }
      if (!n.postTurnType && !n.read && /^[0-9a-f-]{36}$/i.test(n.id)) {
        markSupabaseRead(n.id);
      }
      if (n.reservationId) {
        router.push(`/(customer)/bookings/${n.reservationId}` as Href);
      }
    },
    [router, markSupabaseRead],
  );

  const renderItem = (n: AppNotification) => {
    const cfg = TYPE_CONFIG[n.type];
    const isUnread = !n.read;
    return (
      <Pressable
        key={n.id}
        onPress={() => handlePress(n)}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.72 }]}
      >
        {isUnread && <View style={styles.unreadBar} />}

        <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={18} color={cfg.color} />
        </View>

        <View style={styles.body}>
          <Text style={[styles.notifTitle, isUnread && styles.notifTitleUnread]} numberOfLines={1}>
            {n.title}
          </Text>
          <Text style={styles.notifBody} numberOfLines={2}>{n.body}</Text>
          <Text style={styles.time}>{timeAgo(n.timestamp)}</Text>
        </View>
      </Pressable>
    );
  };

  const BUCKET_ORDER: BucketKey[] = ['today', 'earlier'];
  const BUCKET_LABELS: Record<BucketKey, string> = {
    today: 'Today',
    earlier: 'Earlier',
  };

  const hasAny = allNotifs.length > 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="chevron-back" size={20} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>Activity</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {!hasAny ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-outline" size={26} color={c.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptyBody}>
              Booking confirmations, reminders, and loyalty updates will appear here.
            </Text>
          </View>
        ) : (
          BUCKET_ORDER.map((bk) => {
            const list = buckets[bk];
            if (!list.length) return null;
            return (
              <View key={bk} style={styles.section}>
                <View style={styles.bucketRow}>
                  <View style={styles.goldDot} />
                  <Text style={styles.bucketHeader}>{BUCKET_LABELS[bk]}</Text>
                </View>
                <View style={styles.card}>
                  {list.map((n, i) => (
                    <React.Fragment key={n.id}>
                      {i > 0 && <View style={styles.divider} />}
                      {renderItem(n)}
                    </React.Fragment>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
