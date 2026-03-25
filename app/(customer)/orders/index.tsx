import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Badge, ScreenWrapper } from '@/components/ui';
import { mockReservations } from '@/lib/mock/reservations';
import { mockOrders, type Order } from '@/lib/mock/orders';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { colors, spacing, typography } from '@/lib/theme';

const GUEST_ID = 'g1';

function orderBadgeVariant(status: Order['status']): 'gold' | 'success' | 'warning' | 'danger' | 'info' | 'muted' {
  switch (status) {
    case 'served':
      return 'success';
    case 'cancelled':
      return 'danger';
    case 'preparing':
      return 'info';
    case 'ready':
      return 'warning';
    case 'pending':
      return 'warning';
    case 'confirmed':
      return 'gold';
    default:
      return 'muted';
  }
}

function formatOrderDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function OrdersScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const guestReservationIds = useMemo(
    () => new Set(mockReservations.filter((r) => r.guestId === GUEST_ID).map((r) => r.id)),
    [],
  );

  const orders = useMemo(
    () =>
      mockOrders
        .filter((o) => o.reservationId && guestReservationIds.has(o.reservationId))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [guestReservationIds],
  );

  const renderItem = useCallback(
    ({ item }: { item: Order }) => {
      const count = item.items.reduce((sum, i) => sum + i.quantity, 0);
      return (
        <Card onPress={() => router.push(`/orders/${item.id}`)} style={styles.card}>
          <Text style={styles.restaurantName}>{item.restaurantName}</Text>
          <Text style={styles.date}>{formatOrderDate(item.createdAt, i18n.language)}</Text>
          <View style={styles.row}>
            <Text style={styles.summary}>{t('orders.itemCount', { count })}</Text>
            <Badge label={t(`status.order.${item.status}`)} variant={orderBadgeVariant(item.status)} />
          </View>
          <Text style={styles.total}>{formatCurrency(item.totalAmount, 'cad')}</Text>
        </Card>
      );
    },
    [i18n.language, router, t],
  );

  return (
    <ScreenWrapper scrollable={false}>
      <Text style={[styles.title, { paddingTop: spacing.sm }]}>{t('orders.title')}</Text>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing['3xl'] }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>{t('orders.noOrders')}</Text>
          </View>
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  list: {
    flexGrow: 1,
  },
  card: {
    marginBottom: spacing.md,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  date: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summary: {
    ...typography.body,
    color: colors.textSecondary,
  },
  total: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gold,
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
