import React, { useEffect, useState } from 'react';
import { Alert, View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useStripe } from '@stripe/stripe-react-native';
import { Button, Card } from '@/components/ui';
import { cartSubtotal, parseBookingCartParam } from '@/lib/booking/publicBookingApi';
import { previewDepositCents, type DepositTier } from '@/lib/booking/depositTiers';
import { BOOKING_STEPS_TOTAL } from '@/lib/booking/bookingDefaults';
import { loadRestaurantForBooking } from '@/lib/data/restaurantCatalog';
import { getStoredCustomerPaymentMethods, type CustomerPaymentMethod } from '@/lib/storage/customerPaymentMethods';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { useColors, createStyles, borderRadius } from '@/lib/theme';
import { useReservationHoldContext } from '@/lib/booking/ReservationHoldProvider';
import { isHoldsEnabled } from '@/lib/config/holdsFeature';
import {
  HoldApiError,
  createHoldPaymentIntent,
  refundPaymentIntent,
} from '@/lib/booking/holdApi';

type PaymentMethod = 'card' | 'apple_pay' | 'google_pay';

const useStyles = createStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bgBase },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: 13, color: c.textMuted, fontWeight: '500' },
  progressBar: { height: 3, backgroundColor: c.border, marginHorizontal: 20 },
  progressFill: { height: 3, backgroundColor: c.gold, borderRadius: 2 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  title: { fontSize: 24, fontWeight: '700', color: c.textPrimary, marginTop: 24, marginBottom: 20 },
  breakdownCard: { padding: 20, gap: 12 },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineLabel: { fontSize: 14, color: c.textSecondary },
  lineValue: { fontSize: 14, color: c.textPrimary, fontWeight: '500' },
  totalLine: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border },
  totalLabel: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
  totalValue: { fontSize: 18, fontWeight: '700', color: c.gold },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: c.textPrimary, marginTop: 24, marginBottom: 12 },
  methodCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: c.bgSurface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: c.border, marginBottom: 10, gap: 14 },
  methodCardSelected: { borderColor: c.gold, backgroundColor: 'rgba(201, 168, 76, 0.08)' },
  methodLabel: { flex: 1, fontSize: 15, color: c.textPrimary },
  methodText: { flex: 1, gap: 2 },
  methodLabelSelected: { color: c.gold },
  methodSubLabel: { fontSize: 12, color: c.textMuted, lineHeight: 16 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: c.gold },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: c.gold },
  cardForm: { padding: 16, marginTop: 8, gap: 12 },
  mockCardInput: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: c.bgElevated, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: c.border },
  mockCardText: { fontSize: 15, color: c.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  cardRow: { flexDirection: 'row', gap: 12 },
  secureText: { fontSize: 12, color: c.textMuted, textAlign: 'center', marginTop: 20, lineHeight: 18 },
  payLaterNote: { fontSize: 12, color: c.textMuted, textAlign: 'center', marginTop: 20, lineHeight: 18 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, backgroundColor: c.bgBase, borderTopWidth: 1, borderTopColor: c.border },
}));

export default function Step6Payment() {
  const {
    restaurantId,
    date,
    time,
    partySize,
    tableId,
    occasion,
    notes,
    shiftId,
    slotDateTime,
    name,
    email,
    phone,
    seatingPreference,
    cart: cartParam,
  } = useLocalSearchParams<{
    restaurantId: string;
    date: string;
    time: string;
    partySize: string;
    tableId: string;
    cartTotal: string;
    occasion: string;
    notes?: string;
    shiftId?: string;
    slotDateTime?: string;
    name?: string;
    email?: string;
    phone?: string;
    seatingPreference?: string;
    cart?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const [taxRate, setTaxRate] = useState(0);
  const [depositTiers, setDepositTiers] = useState<DepositTier[] | undefined>(undefined);
  const [defaultCard, setDefaultCard] = useState<CustomerPaymentMethod | null>(null);
  const [paying, setPaying] = useState(false);
  const hold = useReservationHoldContext();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const BOOKING_STEPS = BOOKING_STEPS_TOTAL;
  const STEP = 5;
  const progress = STEP / BOOKING_STEPS;

  const cart = parseBookingCartParam(cartParam);
  const preorderTotal = cartSubtotal(cart);
  const hasPreorder = preorderTotal > 0;
  const taxAmount = preorderTotal * taxRate;
  const partySizeNum = Math.max(1, parseInt(partySize ?? '1', 10) || 1);
  const depositCents = previewDepositCents(depositTiers, partySizeNum);
  const depositAmount = depositCents / 100;
  const hasDeposit = depositCents > 0;
  const totalDue = preorderTotal + taxAmount + depositAmount;
  const qpBase = [
    `date=${encodeURIComponent(date ?? '')}`,
    `time=${encodeURIComponent(time ?? '')}`,
    `partySize=${partySize}`,
    `tableId=${encodeURIComponent(tableId ?? 'auto')}`,
    `shiftId=${encodeURIComponent(shiftId ?? '')}`,
    `slotDateTime=${encodeURIComponent(slotDateTime ?? '')}`,
    `name=${encodeURIComponent(name ?? '')}`,
    `email=${encodeURIComponent(email ?? '')}`,
    `phone=${encodeURIComponent(phone ?? '')}`,
    `occasion=${encodeURIComponent(occasion ?? '')}`,
    `seatingPreference=${encodeURIComponent(seatingPreference ?? '')}`,
    `notes=${encodeURIComponent(notes ?? '')}`,
    `paymentMethod=${selectedMethod}`,
    `cart=${encodeURIComponent(cartParam ?? '')}`,
  ].join('&');

  const paymentMethods: { id: PaymentMethod; label: string; subLabel?: string; icon: keyof typeof Ionicons.glyphMap; platform?: string }[] = [
    { id: 'card', label: 'Pay now by card', subLabel: 'Securely pay for preorder items now.', icon: 'card-outline' },
    ...(Platform.OS === 'ios' ? [{ id: 'apple_pay' as const, label: 'Apple Pay', icon: 'logo-apple' as const }] : []),
    ...(Platform.OS === 'android' ? [{ id: 'google_pay' as const, label: 'Google Pay', icon: 'logo-google' as const }] : []),
  ];

  useEffect(() => {
    let active = true;
    void (async () => {
      const restaurant = await loadRestaurantForBooking(restaurantId);
      if (!active) return;
      setTaxRate(restaurant?.taxRate ?? 0);
      setDepositTiers(restaurant?.depositTiers);
    })();
    return () => {
      active = false;
    };
  }, [restaurantId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const cards = await getStoredCustomerPaymentMethods(name || 'Cardholder').catch(() => []);
      if (!active) return;
      setDefaultCard(cards.find((card) => card.isDefault) ?? cards[0] ?? null);
    })();
    return () => {
      active = false;
    };
  }, [name]);

  const goToConfirmation = (extraQp: string = '') => {
    router.push(`/booking/${restaurantId}/step7-confirmation?${qpBase}${extraQp ? `&${extraQp}` : ''}`);
  };

  const handleConfirmBooking = async () => {
    if (paying) return;

    // No money owed (and either the feature is off, or the diner is on a
    // no-deposit / no-preorder path). The confirmation step will run the
    // create-public-booking call with the hold_id attached.
    if (totalDue <= 0) {
      goToConfirmation();
      return;
    }

    // Holds disabled — fall through to the legacy stubbed flow handled by
    // step7-confirmation (which uses prepareDeposit + confirmDepositStub).
    if (!isHoldsEnabled() || hold.state.status !== 'active' || !restaurantId) {
      goToConfirmation();
      return;
    }

    setPaying(true);
    let createdPaymentIntentId: string | null = null;
    try {
      const totalCents = Math.max(50, Math.round(totalDue * 100));
      const intent = await createHoldPaymentIntent({
        hold_id: hold.state.holdId,
        restaurant_id: restaurantId,
        amount_cents: totalCents,
        currency: 'cad',
        customer_email: email || null,
        customer_name: name || null,
      });
      createdPaymentIntentId = intent.payment_intent_id;

      const initResult = await initPaymentSheet({
        paymentIntentClientSecret: intent.client_secret,
        merchantDisplayName: 'Cenaiva',
        returnURL: 'cenaiva://stripe-redirect',
        applePay: { merchantCountryCode: 'CA' },
        googlePay: { merchantCountryCode: 'CA', testEnv: __DEV__ },
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: {
          name: name || undefined,
          email: email || undefined,
          phone: phone || undefined,
        },
      });
      if (initResult.error) throw new Error(initResult.error.message);

      const presentResult = await presentPaymentSheet();
      if (presentResult.error) {
        if (presentResult.error.code === 'Canceled') {
          // User cancelled — stay on screen, nothing to refund yet.
          return;
        }
        throw new Error(presentResult.error.message);
      }

      const conversion = await hold.confirmHoldPayment(intent.payment_intent_id);
      if (!conversion) {
        // The hook already moved into 'expired' or 'error' state and the
        // HoldExpiredDialog (or the error banner) will surface to the user.
        // Best-effort refund — the webhook usually beats us to it.
        if (createdPaymentIntentId) {
          await refundPaymentIntent(createdPaymentIntentId).catch(() => {});
        }
        return;
      }

      const tableIdsParam = encodeURIComponent(conversion.table_ids.join(','));
      goToConfirmation(
        `paid=1&reservationId=${encodeURIComponent(conversion.reservation_id)}` +
          `&confirmationCode=${encodeURIComponent(conversion.confirmation_code)}` +
          `&tableIds=${tableIdsParam}&durationMinutes=${conversion.duration_minutes}`,
      );
    } catch (error) {
      if (createdPaymentIntentId) {
        await refundPaymentIntent(createdPaymentIntentId).catch(() => {});
      }
      const message =
        error instanceof HoldApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Could not complete payment.';
      Alert.alert(t('booking.holdExpiredTitle'), message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.stepLabel}>
          {t('booking.stepCounter', { current: STEP, total: BOOKING_STEPS })}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('booking.step6Title')}</Text>

        <Card style={styles.breakdownCard}>
          {hasPreorder && (
            <>
              <View style={styles.lineItem}>
                <Text style={styles.lineLabel}>Pre-Order Subtotal</Text>
                <Text style={styles.lineValue}>{formatCurrency(preorderTotal)}</Text>
              </View>
              <View style={styles.lineItem}>
                <Text style={styles.lineLabel}>{t('orders.tax')}</Text>
                <Text style={styles.lineValue}>{formatCurrency(taxAmount)}</Text>
              </View>
            </>
          )}
          {hasDeposit && (
            <View style={styles.lineItem}>
              <Text style={styles.lineLabel}>Deposit ({partySizeNum} × {formatCurrency(depositAmount / partySizeNum)})</Text>
              <Text style={styles.lineValue}>{formatCurrency(depositAmount)}</Text>
            </View>
          )}
          {!hasPreorder && !hasDeposit && (
            <View style={styles.lineItem}>
              <Text style={styles.lineLabel}>Reservation</Text>
              <Text style={styles.lineValue}>No payment due now</Text>
            </View>
          )}
          <View style={[styles.lineItem, styles.totalLine]}>
            <Text style={styles.totalLabel}>{t('orders.total')}</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalDue)}</Text>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Payment Method</Text>
        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.id}
            onPress={() => setSelectedMethod(method.id)}
            style={[styles.methodCard, selectedMethod === method.id && styles.methodCardSelected]}
          >
            <Ionicons name={method.icon} size={24} color={selectedMethod === method.id ? c.gold : c.textSecondary} />
            <View style={styles.methodText}>
              <Text style={[styles.methodLabel, selectedMethod === method.id && styles.methodLabelSelected]}>
                {method.label}
              </Text>
              {method.subLabel ? <Text style={styles.methodSubLabel}>{method.subLabel}</Text> : null}
            </View>
            <View style={[styles.radio, selectedMethod === method.id && styles.radioSelected]}>
              {selectedMethod === method.id && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}

        {selectedMethod === 'card' && (
          <Card style={styles.cardForm}>
            <View style={styles.mockCardInput}>
              <Ionicons name="card" size={20} color={c.textMuted} />
              <Text style={styles.mockCardText}>
                {defaultCard ? `${defaultCard.brand.toUpperCase()} •••• ${defaultCard.last4}` : 'No saved card on file'}
              </Text>
            </View>
            {defaultCard?.expiry ? (
              <View style={styles.mockCardInput}>
                <Text style={styles.mockCardText}>Expires {defaultCard.expiry}</Text>
              </View>
            ) : null}
          </Card>
        )}

        <Text style={styles.secureText}>
          <Ionicons name="lock-closed" size={12} color={c.textMuted} /> Secured by Stripe. Your payment information is encrypted.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          title={paying ? t('common.loading', 'Please wait…') as string : `${t('booking.confirmBooking')} · ${formatCurrency(totalDue)}`}
          onPress={handleConfirmBooking}
          disabled={paying}
        />
      </View>
    </View>
  );
}
