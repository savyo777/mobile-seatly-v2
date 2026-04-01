import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper, Card, Badge } from '@/components/ui';
import { mockReservations, type Reservation } from '@/lib/mock/reservations';
import { mockOrders, type Order } from '@/lib/mock/orders';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { colors, spacing, borderRadius, typography, shadows } from '@/lib/theme';

const GUEST_ID = 'g1';

type ActivityType = 'booking' | 'order';
type SegmentKey = 'upcoming' | 'past';

interface ActivityItem {
  id: string;
  type: ActivityType;
  restaurantName: string;
  whenIso: string;
  statusLabel: string;
  badgeVariant: 'gold' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
  partySize?: number;
  itemCount?: number;
  totalAmount?: number;
  referenceId: string;
}

function reservationBadgeVariant(status: Reservation['status']): ActivityItem['badgeVariant'] {
  switch (status) {
    case 'confirmed':
      return 'gold';
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'danger';
    case 'pending':
      return 'warning';
    case 'seated':
      return 'info';
    case 'no_show':
      return 'muted';
    default:
      return 'muted';
  }
}

function orderBadgeVariant(status: Order['status']): ActivityItem['badgeVariant'] {
  switch (status) {
    case 'confirmed':
      return 'gold';
    case 'pending':
      return 'warning';
    case 'preparing':
      return 'info';
    case 'ready':
      return 'warning';
    case 'served':
      return 'success';
    case 'cancelled':
      return 'danger';
    default:
      return 'muted';
  }
}

function isUpcomingReservation(r: Reservation): boolean {
  const endStatuses: Reservation['status'][] = ['completed', 'cancelled', 'no_show'];
  if (endStatuses.includes(r.status)) return false;
  return new Date(r.reservedAt).getTime() >= Date.now();
}

function isUpcomingOrder(o: Order): boolean {
  // Orders are "upcoming" only while still in progress.
  const inProgress = ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status);
  if (!inProgress) return false;
  return new Date(o.createdAt).getTime() >= Date.now();
}

function HighlightRow({
  icon,
  title,
  sub,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.hlRow, !last && styles.hlRowBorder]}>
      <View style={styles.hlIcon}>
        <Ionicons name={icon} size={18} color={colors.gold} />
      </View>
      <View style={styles.hlText}>
        <Text style={styles.hlTitle}>{title}</Text>
        <Text style={styles.hlSub}>{sub}</Text>
      </View>
    </View>
  );
}

function formatWhen(iso: string, locale: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export default function ActivityScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = useState<SegmentKey>('upcoming');

  const items = useMemo(() => {
    const bookings: ActivityItem[] = mockReservations
      .filter((r) => r.guestId === GUEST_ID)
      .map((r) => {
        const whenIso = r.reservedAt;
        return {
          id: r.id,
          type: 'booking',
          restaurantName: r.restaurantName,
          whenIso,
          statusLabel: t(`status.reservation.${r.status}`),
          badgeVariant: reservationBadgeVariant(r.status),
          partySize: r.partySize,
          referenceId: r.confirmationCode,
        };
      });

    const orders: ActivityItem[] = mockOrders.map((o) => {
      const itemCount = o.items.reduce((sum, it) => sum + it.quantity, 0);
      return {
        id: o.id,
        type: 'order',
        restaurantName: o.restaurantName,
        whenIso: o.createdAt,
        statusLabel: t(`status.order.${o.status}`),
        badgeVariant: orderBadgeVariant(o.status),
        itemCount,
        totalAmount: o.totalAmount,
        referenceId: o.id,
      };
    });

    return [...bookings, ...orders];
  }, [t]);

  const segmentItems = useMemo(() => {
    const now = Date.now();
    const filtered = items.filter((item) => {
      if (item.type === 'booking') {
        const res = mockReservations.find((r) => r.id === item.id);
        if (!res) return false;
        return segment === 'upcoming' ? isUpcomingReservation(res) : !isUpcomingReservation(res);
      }

      const ord = mockOrders.find((o) => o.id === item.id);
      if (!ord) return false;
      return segment === 'upcoming' ? isUpcomingOrder(ord) : !isUpcomingOrder(ord);
    });

    return filtered.sort((a, b) => {
      const ta = new Date(a.whenIso).getTime();
      const tb = new Date(b.whenIso).getTime();
      return segment === 'upcoming' ? ta - tb : tb - ta;
    });
  }, [items, segment]);

  const emptyCopy = segment === 'upcoming' ? t('bookings.noUpcoming') : t('bookings.noPast');

  const renderItem = ({ item }: { item: ActivityItem }) => {
    const when = formatWhen(item.whenIso, i18n.language);
    const iconName = item.type === 'booking' ? 'calendar-outline' : 'receipt-outline';
    const iconBg = item.type === 'booking' ? 'rgba(201,168,76,0.12)' : 'rgba(201,168,76,0.08)';

    const subLine =
      item.type === 'booking'
        ? t('bookings.partyOf', { count: item.partySize ?? 0 })
        : `${item.itemCount ?? 0} items • ${formatCurrency(item.totalAmount ?? 0, 'cad')}`;

    return (
      <Card
        onPress={() => {
          if (item.type === 'booking') router.push(`/bookings/${item.id}`);
          else router.push(`/orders/${item.id}`);
        }}
        style={styles.itemCard}
      >
        <View style={styles.itemTop}>
          <View style={styles.iconWrap}>
            <View style={[styles.iconBg, { backgroundColor: iconBg }]}>
              <Ionicons name={iconName} size={18} color={colors.gold} />
            </View>
          </View>
          <View style={styles.itemMain}>
            <Text style={styles.itemRestaurant} numberOfLines={1}>
              {item.restaurantName}
            </Text>
            <Text style={styles.itemWhen}>{when}</Text>
          </View>
          <Badge label={item.statusLabel} variant={item.badgeVariant} />
        </View>

        <View style={styles.itemBottom}>
          <Text style={styles.itemTypeLine}>
            {item.type === 'booking' ? 'Booking' : 'Order'} • {subLine}
          </Text>
          <Text style={styles.itemRef} numberOfLines={1}>
            Ref: {item.referenceId}
          </Text>
        </View>
      </Card>
    );
  };

  const listHeader = (
    <View>
      <Text style={styles.title}>{t('activity.title')}</Text>

      <View style={styles.segment}>
        <Pressable
          onPress={() => setSegment('upcoming')}
          style={[styles.segmentBtn, segment === 'upcoming' && styles.segmentBtnActive]}
        >
          <Text style={[styles.segmentLabel, segment === 'upcoming' && styles.segmentLabelActive]}>{t('activity.upcoming')}</Text>
        </Pressable>
        <Pressable
          onPress={() => setSegment('past')}
          style={[styles.segmentBtn, segment === 'past' && styles.segmentBtnActive]}
        >
          <Text style={[styles.segmentLabel, segment === 'past' && styles.segmentLabelActive]}>{t('activity.past')}</Text>
        </Pressable>
      </View>

      <Card style={styles.highlights}>
        <Text style={styles.highlightsTitle}>Recent highlights</Text>
        <HighlightRow icon="calendar" title="Booked Nova Ristorante" sub="Sat, Mar 8 · Party of 2" />
        <HighlightRow icon="trophy" title="Earned 120 loyalty points" sub="Posted after your visit" />
        <HighlightRow icon="gift-outline" title="Redeemed free dessert" sub="Mar 1 · Nova Ristorante" last />
      </Card>
    </View>
  );

  return (
    <ScreenWrapper scrollable={false} padded>
      <FlatList
        style={styles.flatList}
        data={segmentItems}
        keyExtractor={(it) => `${it.type}-${it.id}`}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing['3xl'] }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name={segment === 'upcoming' ? 'calendar-outline' : 'archive-outline'} size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>{emptyCopy}</Text>
          </View>
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flatList: {
    flex: 1,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  highlights: {
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  highlightsTitle: {
    ...typography.label,
    color: colors.gold,
    marginBottom: spacing.md,
  },
  hlRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  hlRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.xs,
  },
  hlIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(201, 168, 76, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hlText: {
    flex: 1,
  },
  hlTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  hlSub: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 2,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: spacing.lg,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(201, 168, 76, 0.18)',
  },
  segmentLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentLabelActive: {
    color: colors.gold,
  },
  list: {
    flexGrow: 1,
    paddingBottom: spacing['2xl'],
  },
  itemCard: {
    marginBottom: spacing.md,
    ...shadows.card,
  },
  itemCardBooking: {},
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 36,
  },
  iconBg: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMain: { flex: 1 },
  itemRestaurant: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  itemWhen: {
    ...typography.body,
    color: colors.textSecondary,
  },
  itemBottom: {
    gap: 2,
  },
  itemTypeLine: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  itemRef: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

