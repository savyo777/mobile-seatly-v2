import React, { useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors, createStyles, borderRadius, spacing } from '@/lib/theme';
import { mockReservations } from '@/lib/mock/reservations';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { mockCustomer } from '@/lib/mock/users';

const ME = mockCustomer.id;

type AppNotifType =
  | 'booking_confirmed'
  | 'reminder_24h'
  | 'reminder_2h'
  | 'cancelled'
  | 'loyalty_milestone'
  | 'waitlist_ready';

type AppNotification = {
  id: string;
  type: AppNotifType;
  title: string;
  body: string;
  timestamp: string;
  reservationId?: string;
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
};

function buildMockNotifications(): AppNotification[] {
  const myReservations = mockReservations
    .filter((r) => r.guestId === ME)
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

  const allNotifs = buildMockNotifications();
  const buckets = bucket(allNotifs);

  const handlePress = useCallback(
    (n: AppNotification) => {
      if (n.reservationId) {
        router.push(`/(customer)/bookings/${n.reservationId}` as Href);
      }
    },
    [router],
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
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing['4xl'] }}
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
