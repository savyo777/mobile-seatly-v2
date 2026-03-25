import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Badge, ScreenWrapper } from '@/components/ui';
import { mockOrders, type Order } from '@/lib/mock/orders';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { colors, spacing, borderRadius, typography } from '@/lib/theme';

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

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

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const order = useMemo(() => mockOrders.find((o) => o.id === id), [id]);

  if (!order) {
    return (
      <ScreenWrapper>
        <View style={styles.centered}>
          <Text style={styles.muted}>{t('orders.notFound')}</Text>
          <Pressable onPress={() => router.back()} style={styles.backHit}>
            <Text style={styles.backLink}>{t('common.back')}</Text>
          </Pressable>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12} style={styles.backHit}>
          <Ionicons name="chevron-back" size={26} color={colors.gold} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing['3xl'] }]}
      >
        <Text style={styles.h2}>{order.restaurantName}</Text>
        <View style={styles.statusWrap}>
          <Badge label={t(`status.order.${order.status}`)} variant={orderBadgeVariant(order.status)} size="md" />
        </View>

        {order.tableNumber ? (
          <View style={styles.tableRow}>
            <Ionicons name="restaurant-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.tableText}>
              {t('orders.tableNumber')}: {order.tableNumber}
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>{t('orders.items')}</Text>
        <Card style={styles.itemsCard}>
          {order.items.map((line, index) => (
            <View key={line.id} style={[styles.line, index === order.items.length - 1 && styles.lineLast]}>
              <View style={styles.lineTop}>
                <Text style={styles.lineName}>
                  {line.quantity}× {line.name}
                </Text>
                <Text style={styles.lineTotal}>{formatCurrency(line.lineTotal, 'cad')}</Text>
              </View>
              <Text style={styles.unitPrice}>
                {t('orders.unitPrice')}: {formatCurrency(line.unitPrice, 'cad')} · {t('orders.each')}
              </Text>
              {line.modifications ? (
                <Text style={styles.mods}>
                  {t('orders.modifications')}: {line.modifications}
                </Text>
              ) : null}
            </View>
          ))}
        </Card>

        <Card style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('orders.subtotal')}</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.subtotal, 'cad')}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('orders.tax')}</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.taxAmount, 'cad')}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('orders.tip')}</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.tipAmount, 'cad')}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandRow]}>
            <Text style={styles.grandLabel}>{t('orders.total')}</Text>
            <Text style={styles.grandValue}>{formatCurrency(order.totalAmount, 'cad')}</Text>
          </View>
        </Card>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  backHit: {
    padding: spacing.xs,
  },
  scroll: {
    paddingBottom: spacing['3xl'],
  },
  h2: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  statusWrap: {
    marginBottom: spacing.lg,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tableText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  sectionLabel: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  itemsCard: {
    marginBottom: spacing.lg,
  },
  line: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lineLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  lineTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  lineName: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  lineTotal: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  unitPrice: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 4,
    fontFamily: mono,
  },
  mods: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  totalsCard: {
    marginBottom: spacing.lg,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  totalLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  totalValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  grandRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: 0,
  },
  grandLabel: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  grandValue: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.gold,
    fontVariant: ['tabular-nums'],
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    ...typography.body,
    color: colors.textSecondary,
  },
  backLink: {
    ...typography.bodyLarge,
    color: colors.gold,
    fontWeight: '600',
    marginTop: spacing.md,
  },
});
