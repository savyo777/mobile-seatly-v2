import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '@/components/ui';
import { cartSubtotal, parseBookingCartParam } from '@/lib/booking/publicBookingApi';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { useColors, createStyles, borderRadius } from '@/lib/theme';

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
  methodLabelSelected: { color: c.gold },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: c.gold },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: c.gold },
  cardForm: { padding: 16, marginTop: 8, gap: 12 },
  mockCardInput: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: c.bgElevated, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: c.border },
  mockCardText: { fontSize: 15, color: c.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  cardRow: { flexDirection: 'row', gap: 12 },
  secureText: { fontSize: 12, color: c.textMuted, textAlign: 'center', marginTop: 20, lineHeight: 18 },
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
  const BOOKING_STEPS = 6;
  const STEP = 5;
  const progress = STEP / BOOKING_STEPS;

  const cart = parseBookingCartParam(cartParam);
  const preorderTotal = cartSubtotal(cart);
  const hasPreorder = preorderTotal > 0;
  const taxAmount = preorderTotal * 0.13;
  const totalDue = preorderTotal + taxAmount;
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
    `paymentMethod=${selectedMethod === 'card' ? 'card' : 'card'}`,
    `cart=${encodeURIComponent(cartParam ?? '')}`,
  ].join('&');

  const paymentMethods: { id: PaymentMethod; label: string; icon: keyof typeof Ionicons.glyphMap; platform?: string }[] = [
    { id: 'card', label: 'Credit / Debit Card', icon: 'card-outline' },
    ...(Platform.OS === 'ios' ? [{ id: 'apple_pay' as const, label: 'Apple Pay', icon: 'logo-apple' as const }] : []),
    ...(Platform.OS === 'android' ? [{ id: 'google_pay' as const, label: 'Google Pay', icon: 'logo-google' as const }] : []),
  ];

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
                <Text style={styles.lineLabel}>{t('orders.tax')} (13%)</Text>
                <Text style={styles.lineValue}>{formatCurrency(taxAmount)}</Text>
              </View>
            </>
          )}
          {!hasPreorder && (
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
            <Text style={[styles.methodLabel, selectedMethod === method.id && styles.methodLabelSelected]}>
              {method.label}
            </Text>
            <View style={[styles.radio, selectedMethod === method.id && styles.radioSelected]}>
              {selectedMethod === method.id && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}

        {selectedMethod === 'card' && (
          <Card style={styles.cardForm}>
            <View style={styles.mockCardInput}>
              <Ionicons name="card" size={20} color={c.textMuted} />
              <Text style={styles.mockCardText}>•••• •••• •••• 4242</Text>
            </View>
            <View style={styles.cardRow}>
              <View style={[styles.mockCardInput, { flex: 1 }]}>
                <Text style={styles.mockCardText}>12/28</Text>
              </View>
              <View style={[styles.mockCardInput, { flex: 1 }]}>
                <Text style={styles.mockCardText}>•••</Text>
              </View>
            </View>
          </Card>
        )}

        <Text style={styles.secureText}>
          <Ionicons name="lock-closed" size={12} color={c.textMuted} /> Secured by Stripe. Your payment information is encrypted.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          title={`${t('booking.confirmBooking')} · ${formatCurrency(totalDue)}`}
          onPress={() => router.push(`/booking/${restaurantId}/step7-confirmation?${qpBase}`)}
        />
      </View>
    </View>
  );
}
