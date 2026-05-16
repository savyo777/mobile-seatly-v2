import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Badge, ScreenWrapper } from '@/components/ui';
import {
  mockReservations as DEMO_RESERVATIONS,
  cancelReservationByIdAsync,
  type Reservation,
} from '@/lib/mock/reservations';
import { mockOrders as DEMO_ORDERS } from '@/lib/mock/orders';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { getSupabase } from '@/lib/supabase/client';

const mockReservations: typeof DEMO_RESERVATIONS = isDemoModeEnabled() ? DEMO_RESERVATIONS : [];
const mockOrders: typeof DEMO_ORDERS = isDemoModeEnabled() ? DEMO_ORDERS : [];
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { useColors, createStyles, spacing, borderRadius, typography } from '@/lib/theme';

function reservationBadgeVariant(
  status: Reservation['status'],
): 'gold' | 'success' | 'warning' | 'danger' | 'info' | 'muted' {
  switch (status) {
    case 'confirmed':  return 'gold';
    case 'completed':  return 'success';
    case 'cancelled':  return 'danger';
    case 'pending':    return 'warning';
    case 'seated':     return 'info';
    case 'no_show':    return 'muted';
    default:           return 'muted';
  }
}

function isUpcomingReservation(r: Reservation): boolean {
  const endStatuses: Reservation['status'][] = ['completed', 'cancelled', 'no_show'];
  if (endStatuses.includes(r.status)) return false;
  return new Date(r.reservedAt).getTime() >= Date.now();
}

function isModifiableReservation(r: Reservation): boolean {
  return (r.status === 'pending' || r.status === 'confirmed') &&
    new Date(r.reservedAt).getTime() >= Date.now();
}

function formatBookingWhen(iso: string, locale: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(d),
    time: new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(d),
  };
}

const useStyles = createStyles((c) => ({
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
    color: c.textPrimary,
    marginBottom: spacing.md,
  },
  statusWrap: {
    marginBottom: spacing.lg,
  },
  detailsCard: {
    marginBottom: spacing.lg,
  },
  detailLabel: {
    ...typography.label,
    color: c.textMuted,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailValue: {
    ...typography.bodyLarge,
    color: c.textPrimary,
    flex: 1,
  },
  sectionLabel: {
    ...typography.h3,
    color: c.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  codeBox: {
    borderWidth: 1,
    borderColor: c.gold,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: c.bgSurface,
    marginBottom: spacing.lg,
  },
  codeText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 20,
    fontWeight: '600',
    color: c.gold,
    textAlign: 'center',
    letterSpacing: 2,
  },
  noteCard: {
    marginBottom: spacing.lg,
  },
  noteText: {
    ...typography.body,
    color: c.textSecondary,
  },
  preorderCard: {
    marginBottom: spacing.lg,
  },
  preorderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  preorderName: {
    ...typography.body,
    color: c.textPrimary,
    flex: 1,
    paddingRight: spacing.md,
  },
  preorderPrice: {
    ...typography.body,
    color: c.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  preorderTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  preorderTotalLabel: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: c.textPrimary,
  },
  preorderTotal: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: c.gold,
  },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    gap: spacing.sm,
    backgroundColor: c.bgBase,
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  muted: {
    ...typography.body,
    color: c.textSecondary,
  },
}));

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();

  const [cancelledLocally, setCancelledLocally] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [liveReservation, setLiveReservation] = useState<Reservation | null>(null);
  const [liveCancellationReason, setLiveCancellationReason] = useState<string | null>(null);
  const [liveDepositStatus, setLiveDepositStatus] = useState<string | null>(null);

  type PreorderItemRow = {
    id: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  };
  type PreorderOrder = {
    id: string;
    subtotal: number;
    tax_amount: number;
    tip_amount: number;
    total_amount: number;
    status: string | null;
    items: PreorderItemRow[];
  };
  const [livePreorder, setLivePreorder] = useState<PreorderOrder | null>(null);
  const [preorderLoadedFor, setPreorderLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    if (mockReservations.find((r) => r.id === id)) return;
    let cancelled = false;
    const supabase = getSupabase();
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase
        .from('reservations')
        .select('id,restaurant_id,reserved_at,party_size,status,confirmation_code,occasion,special_request,preorder_order_id,deposit_amount,deposit_status,cancellation_reason,table_id,source,guest_full_name,restaurant:restaurants(id,name)')
        .eq('id', id)
        .neq('status', 'no_show')
        .maybeSingle();
      if (cancelled || !data) return;
      const row = data as {
        id: string;
        restaurant_id: string;
        reserved_at: string;
        party_size: number | null;
        status: string | null;
        confirmation_code: string | null;
        occasion: string | null;
        special_request: string | null;
        preorder_order_id: string | null;
        deposit_amount: number | null;
        deposit_status: string | null;
        cancellation_reason: string | null;
        table_id: string | null;
        source: string | null;
        guest_full_name: string | null;
        restaurant: { id: string; name: string | null } | Array<{ id: string; name: string | null }> | null;
      };
      const restaurant = Array.isArray(row.restaurant) ? row.restaurant[0] ?? null : row.restaurant;
      const status = (
        row.status === 'pending' || row.status === 'confirmed' || row.status === 'seated' ||
        row.status === 'completed' || row.status === 'cancelled' || row.status === 'no_show'
      ) ? row.status : 'confirmed';
      setLiveReservation({
        id: row.id,
        restaurantId: row.restaurant_id,
        restaurantName: restaurant?.name ?? '',
        guestId: '',
        tableId: row.table_id ?? undefined,
        partySize: row.party_size ?? 1,
        reservedAt: row.reserved_at,
        status,
        source: 'app',
        confirmationCode: row.confirmation_code ?? '',
        specialRequest: row.special_request ?? undefined,
        occasion: row.occasion ?? undefined,
        guestName: row.guest_full_name ?? '',
        preorderOrderId: row.preorder_order_id ?? undefined,
        depositAmount: row.deposit_amount ?? undefined,
      });
      setLiveCancellationReason(row.cancellation_reason ?? null);
      setLiveDepositStatus(row.deposit_status ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const reservation = useMemo(
    () => mockReservations.find((r) => r.id === id) ?? liveReservation ?? undefined,
    [id, cancelledLocally, liveReservation],
  );
  const mockPreorder = useMemo(
    () => (reservation?.preorderOrderId ? mockOrders.find((o) => o.id === reservation.preorderOrderId) : undefined),
    [reservation],
  );

  useEffect(() => {
    const orderId = reservation?.preorderOrderId;
    if (!orderId) {
      setLivePreorder(null);
      return;
    }
    if (mockPreorder) return;
    if (preorderLoadedFor === orderId) return;
    let cancelled = false;
    const supabase = getSupabase();
    if (!supabase) return;
    void (async () => {
      const [orderRes, itemsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id,subtotal,tax_amount,tip_amount,total_amount,status')
          .eq('id', orderId)
          .maybeSingle(),
        supabase
          .from('order_items')
          .select('id,name,quantity,unit_price,total_price')
          .eq('order_id', orderId)
          .order('created_at', { ascending: true }),
      ]);
      if (cancelled) return;
      if (orderRes.error || !orderRes.data) {
        setPreorderLoadedFor(orderId);
        return;
      }
      const items = ((itemsRes.data ?? []) as Array<{
        id: string;
        name: string | null;
        quantity: number | null;
        unit_price: number | null;
        total_price: number | null;
      }>).map((line) => ({
        id: line.id,
        name: line.name ?? '',
        quantity: line.quantity ?? 0,
        unit_price: line.unit_price ?? 0,
        total_price: line.total_price ?? 0,
      }));
      setLivePreorder({
        id: orderRes.data.id,
        subtotal: orderRes.data.subtotal ?? 0,
        tax_amount: orderRes.data.tax_amount ?? 0,
        tip_amount: orderRes.data.tip_amount ?? 0,
        total_amount: orderRes.data.total_amount ?? 0,
        status: orderRes.data.status ?? null,
        items,
      });
      setPreorderLoadedFor(orderId);
    })();
    return () => {
      cancelled = true;
    };
  }, [reservation?.preorderOrderId, mockPreorder, preorderLoadedFor]);

  const handleCancel = useCallback(() => {
    if (!reservation) return;
    Alert.alert(
      t('bookings.cancelBooking'),
      t('bookings.cancelConfirmMessage'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('bookings.confirmCancel'),
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            const result = await cancelReservationByIdAsync(reservation.id);
            setCancelling(false);
            if (result.ok) {
              setCancelledLocally(true);
            } else {
              Alert.alert(t('common.error'), result.reason ?? t('common.error'));
            }
          },
        },
      ],
    );
  }, [reservation, t]);

  if (!reservation) {
    return (
      <ScreenWrapper>
        <View style={styles.centered}>
          <Text style={styles.muted}>{t('bookings.notFound')}</Text>
          <Button title={t('common.back')} onPress={() => router.back()} variant="outlined" />
        </View>
      </ScreenWrapper>
    );
  }

  const { date, time } = formatBookingWhen(reservation.reservedAt, i18n.language);
  const showActions = isUpcomingReservation(reservation);
  const canModify = isModifiableReservation(reservation);

  const handleModify = () => {
    const d = new Date(reservation.reservedAt);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const prefillDate = `${yyyy}-${mm}-${dd}`;
    router.push(
      `/booking/${reservation.restaurantId}/step2-time?date=${encodeURIComponent(prefillDate)}&mode=modify&reservationId=${encodeURIComponent(reservation.id)}&excludeRid=${encodeURIComponent(reservation.id)}&prefillParty=${reservation.partySize}`,
    );
  };

  return (
    <ScreenWrapper scrollable={false}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12} style={styles.backHit}>
          <Ionicons name="chevron-back" size={26} color={c.gold} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + (showActions ? 140 : spacing['3xl']) }]}
      >
        <Text style={styles.h2}>{reservation.restaurantName}</Text>
        <View style={styles.statusWrap}>
          <Badge
            label={t(`status.reservation.${reservation.status}`)}
            variant={reservationBadgeVariant(reservation.status)}
            size="md"
          />
        </View>

        <Card style={styles.detailsCard}>
          <Text style={styles.detailLabel}>{t('bookings.bookingDetails')}</Text>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={18} color={c.textSecondary} />
            <Text style={styles.detailValue}>{date}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={18} color={c.textSecondary} />
            <Text style={styles.detailValue} numberOfLines={1}>{time}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={18} color={c.textSecondary} />
            <Text style={styles.detailValue}>{t('bookings.partyOf', { count: reservation.partySize })}</Text>
          </View>
          {reservation.tableId && (
            <View style={styles.detailRow}>
              <Ionicons name="restaurant-outline" size={18} color={c.textSecondary} />
              <Text style={styles.detailValue}>
                {t('bookings.table')}: {reservation.tableId.toUpperCase()}
              </Text>
            </View>
          )}
          {reservation.occasion && (
            <View style={styles.detailRow}>
              <Ionicons name="sparkles-outline" size={18} color={c.textSecondary} />
              <Text style={styles.detailValue}>
                {t('bookings.occasion')}: {reservation.occasion}
              </Text>
            </View>
          )}
        </Card>

        <Text style={styles.sectionLabel}>{t('bookings.confirmation')}</Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>{reservation.confirmationCode}</Text>
        </View>

        {liveDepositStatus && liveDepositStatus !== 'none' ? (
          <View style={styles.detailRow}>
            <Ionicons name="card-outline" size={18} color={c.textSecondary} />
            <Text style={styles.detailValue}>
              Deposit:{' '}
              {liveDepositStatus === 'charged'
                ? 'Paid'
                : liveDepositStatus === 'pending'
                  ? 'Pending'
                  : liveDepositStatus === 'failed'
                    ? 'Failed'
                    : liveDepositStatus === 'waived'
                      ? 'Waived'
                      : 'Refunded'}
            </Text>
          </View>
        ) : null}

        {reservation.status === 'cancelled' && liveCancellationReason ? (
          <>
            <Text style={styles.sectionLabel}>Cancellation reason</Text>
            <Card padded style={styles.noteCard}>
              <Text style={styles.noteText}>{liveCancellationReason}</Text>
            </Card>
          </>
        ) : null}

        {reservation.specialRequest ? (
          <>
            <Text style={styles.sectionLabel}>{t('bookings.specialRequests')}</Text>
            <Card padded style={styles.noteCard}>
              <Text style={styles.noteText}>{reservation.specialRequest}</Text>
            </Card>
          </>
        ) : null}

        {mockPreorder ? (
          <>
            <Text style={styles.sectionLabel}>{t('bookings.preorderSummary')}</Text>
            <Card style={styles.preorderCard}>
              {mockPreorder.items.map((line) => (
                <View key={line.id} style={styles.preorderLine}>
                  <Text style={styles.preorderName}>
                    {line.quantity}× {line.name}
                  </Text>
                  <Text style={styles.preorderPrice}>{formatCurrency(line.lineTotal, 'cad')}</Text>
                </View>
              ))}
              <View style={styles.preorderTotalRow}>
                <Text style={styles.preorderTotalLabel}>{t('orders.total')}</Text>
                <Text style={styles.preorderTotal}>{formatCurrency(mockPreorder.totalAmount, 'cad')}</Text>
              </View>
            </Card>
          </>
        ) : livePreorder ? (
          <>
            <Text style={styles.sectionLabel}>{t('bookings.preorderSummary')}</Text>
            <Card style={styles.preorderCard}>
              {livePreorder.items.length > 0 ? (
                livePreorder.items.map((line) => (
                  <View key={line.id} style={styles.preorderLine}>
                    <Text style={styles.preorderName}>
                      {line.quantity}× {line.name}
                    </Text>
                    <Text style={styles.preorderPrice}>{formatCurrency(line.total_price, 'cad')}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noteText}>No items.</Text>
              )}
              <View style={styles.preorderTotalRow}>
                <Text style={styles.preorderTotalLabel}>{t('orders.total')}</Text>
                <Text style={styles.preorderTotal}>{formatCurrency(livePreorder.total_amount, 'cad')}</Text>
              </View>
            </Card>
          </>
        ) : null}
      </ScrollView>

      {showActions ? (
        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          {canModify ? (
            <Button title={t('bookings.modifyBooking')} onPress={handleModify} variant="outlined" />
          ) : null}
          <Button title={t('bookings.cancelBooking')} onPress={handleCancel} variant="danger" disabled={cancelling} />
        </View>
      ) : null}
    </ScreenWrapper>
  );
}
