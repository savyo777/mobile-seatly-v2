import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Badge, ScreenWrapper } from '@/components/ui';
import { mockReservations, cancelReservationByIdAsync, type Reservation } from '@/lib/mock/reservations';
import { mockOrders } from '@/lib/mock/orders';
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

  const reservation = useMemo(() => mockReservations.find((r) => r.id === id), [id, cancelledLocally]);
  const preorder = useMemo(
    () => (reservation?.preorderOrderId ? mockOrders.find((o) => o.id === reservation.preorderOrderId) : undefined),
    [reservation],
  );

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
            <Text style={styles.detailValue}>{time}</Text>
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

        {reservation.specialRequest ? (
          <>
            <Text style={styles.sectionLabel}>{t('bookings.specialRequests')}</Text>
            <Card padded style={styles.noteCard}>
              <Text style={styles.noteText}>{reservation.specialRequest}</Text>
            </Card>
          </>
        ) : null}

        {preorder ? (
          <>
            <Text style={styles.sectionLabel}>{t('bookings.preorderSummary')}</Text>
            <Card style={styles.preorderCard}>
              {preorder.items.map((line) => (
                <View key={line.id} style={styles.preorderLine}>
                  <Text style={styles.preorderName}>
                    {line.quantity}× {line.name}
                  </Text>
                  <Text style={styles.preorderPrice}>{formatCurrency(line.lineTotal, 'cad')}</Text>
                </View>
              ))}
              <View style={styles.preorderTotalRow}>
                <Text style={styles.preorderTotalLabel}>{t('orders.total')}</Text>
                <Text style={styles.preorderTotal}>{formatCurrency(preorder.totalAmount, 'cad')}</Text>
              </View>
            </Card>
          </>
        ) : null}
      </ScrollView>

      {showActions ? (
        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Button title={t('bookings.modifyBooking')} onPress={() => {}} variant="outlined" />
          <Button title={t('bookings.cancelBooking')} onPress={handleCancel} variant="danger" disabled={cancelling} />
        </View>
      ) : null}
    </ScreenWrapper>
  );
}
