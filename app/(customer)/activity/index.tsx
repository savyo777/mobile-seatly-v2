import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper, Card, Badge, ChevronGlyph } from '@/components/ui';
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
  const inProgress = ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status);
  if (!inProgress) return false;
  return new Date(o.createdAt).getTime() >= Date.now();
}

function HighlightRow({ title, sub, last }: { title: string; sub: string; last?: boolean }) {
  return (
    <View style={[styles.hlRow, !last && styles.hlRowBorder]}>
      <View style={styles.hlAccent} />
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
          type: 'booking' as const,
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
        type: 'order' as const,
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

  const openDetail = (item: ActivityItem) => {
    if (item.type === 'booking') router.push(`/bookings/${item.id}` as Href);
    else router.push(`/orders/${item.id}` as Href);
  };

  const openReceipt = (item: ActivityItem) => {
    router.push(`/(customer)/activity/receipt/${item.type}/${item.id}` as Href);
  };

  const renderItem = ({ item }: { item: ActivityItem }) => {
    const when = formatWhen(item.whenIso, i18n.language);
    const subLine =
      item.type === 'booking'
        ? t('bookings.partyOf', { count: item.partySize ?? 0 })
        : `${item.itemCount ?? 0} items • ${formatCurrency(item.totalAmount ?? 0, 'cad')}`;

    return (
      <View style={[styles.itemCard, shadows.card]}>
        <Pressable
          onPress={() => openDetail(item)}
          style={({ pressed }) => [styles.itemCardInner, pressed && styles.itemCardPressed]}
        >
          <View style={styles.itemTop}>
            <View style={styles.itemAccent} />
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
              {item.type === 'booking' ? t('receipt.kindBooking') : t('receipt.kindOrder')} • {subLine}
            </Text>
            <Text style={styles.itemRef} numberOfLines={1}>
              {t('receipt.refLabel')} {item.referenceId}
            </Text>
          </View>
        </Pressable>

        <View style={styles.receiptBar}>
          <Pressable
            onPress={() => openReceipt(item)}
            style={({ pressed }) => [styles.receiptBtn, pressed && styles.receiptBtnPressed]}
            hitSlop={6}
          >
            <Text style={styles.receiptBtnLabel}>{t('receipt.viewReceipt')}</Text>
            <ChevronGlyph color={colors.gold} size={20} />
          </Pressable>
        </View>
      </View>
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
        <HighlightRow title="Booked Nova Ristorante" sub="Sat, Mar 8 · Party of 2" />
        <HighlightRow title="Earned 120 loyalty points" sub="Posted after your visit" />
        <HighlightRow title="Redeemed free dessert" sub="Mar 1 · Nova Ristorante" last />
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
            <Text style={styles.emptyMark} accessible={false}>
              —
            </Text>
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
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  hlRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.xs,
  },
  hlAccent: {
    width: 3,
    alignSelf: 'stretch',
    minHeight: 36,
    borderRadius: 2,
    backgroundColor: 'rgba(201, 168, 76, 0.55)',
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
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  itemCardInner: {
    padding: spacing.lg,
  },
  itemCardPressed: {
    opacity: 0.92,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  itemAccent: {
    width: 3,
    alignSelf: 'stretch',
    minHeight: 44,
    borderRadius: 2,
    backgroundColor: 'rgba(201, 168, 76, 0.45)',
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
  receiptBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(201, 168, 76, 0.04)',
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  receiptBtnPressed: {
    opacity: 0.75,
  },
  receiptBtnLabel: {
    ...typography.bodySmall,
    color: colors.gold,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
    gap: spacing.md,
  },
  emptyMark: {
    fontSize: 40,
    lineHeight: 44,
    color: colors.textMuted,
    fontWeight: '300',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
