import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStripe } from '@stripe/stripe-react-native';
import { Button, Card } from '@/components/ui';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { getSupabase } from '@/lib/supabase/client';
import { friendlyError } from '@/lib/errors/friendlyError';
import {
  chargeOrder,
  readNextActionFromError,
  type ChargeOrderSuccess,
} from '@/lib/orders/chargeOrder';
import { computeDinerCharge, formatCents } from '@/lib/stripe/stripeFee';

type OrderRow = {
  id: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  tip_amount: number | null;
  total_amount: number | null;
  status: string | null;
  paid_at: string | null;
  restaurant_id: string;
};

type TipChoice = { kind: 'none' } | { kind: 'percent'; value: number } | { kind: 'custom'; value: number };

const TIP_PRESETS = [15, 18, 20];

const useStyles = createStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bgBase },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: c.textPrimary, paddingHorizontal: 20, marginTop: 4, marginBottom: 16 },
  card: { padding: 20, marginHorizontal: 20, marginBottom: 16, gap: 12, backgroundColor: c.bgSurface, borderColor: c.border, borderWidth: 1, borderRadius: borderRadius.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, color: c.textSecondary },
  value: { fontSize: 14, color: c.textPrimary, fontWeight: '500' },
  divider: { height: 1, backgroundColor: c.border, marginVertical: 4 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
  totalValue: { fontSize: 18, fontWeight: '700', color: c.gold },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: c.textPrimary, marginHorizontal: 20, marginTop: 8, marginBottom: 12 },
  tipRow: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 16 },
  tipChip: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: borderRadius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgSurface },
  tipChipOn: { borderColor: c.gold, backgroundColor: 'rgba(201, 168, 76, 0.12)' },
  tipChipLabel: { fontSize: 14, fontWeight: '600', color: c.textSecondary },
  tipChipLabelOn: { color: c.gold },
  tipChipSub: { fontSize: 11, color: c.textMuted, marginTop: 2 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, marginBottom: 8 },
  customInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.md, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, height: 48 },
  customInputPrefix: { fontSize: 16, color: c.textMuted, marginRight: 6 },
  feeNote: { fontSize: 12, color: c.textMuted, paddingHorizontal: 20, marginTop: -4, marginBottom: 16, lineHeight: 16 },
  footer: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bgBase },
  emptyText: { fontSize: 14, color: c.textMuted, paddingHorizontal: 20, lineHeight: 20 },
  secureText: { fontSize: 12, color: c.textMuted, textAlign: 'center', marginTop: 16, marginBottom: 8 },
}));

export default function PayTheBillScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const { handleNextAction } = useStripe();

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [tip, setTip] = useState<TipChoice>({ kind: 'percent', value: 18 });
  const [success, setSuccess] = useState<ChargeOrderSuccess | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabase = getSupabase();
      if (!supabase || !orderId) {
        if (active) setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('orders')
        .select('id, subtotal, tax_amount, discount_amount, tip_amount, total_amount, status, paid_at, restaurant_id')
        .eq('id', orderId)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        Alert.alert('Pay bill', friendlyError(error, 'We couldn’t load this bill.'));
        setLoading(false);
        return;
      }
      setOrder(data as OrderRow);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [orderId]);

  const subtotalCents = useMemo(() => Math.round((order?.subtotal ?? 0) * 100), [order]);
  const taxCents = useMemo(() => Math.round((order?.tax_amount ?? 0) * 100), [order]);
  const discountCents = useMemo(() => Math.round((order?.discount_amount ?? 0) * 100), [order]);
  const tipCents = useMemo(() => {
    if (tip.kind === 'none') return 0;
    if (tip.kind === 'percent') return Math.round(subtotalCents * (tip.value / 100));
    return Math.max(0, Math.round(tip.value * 100));
  }, [tip, subtotalCents]);
  const baseTotalCents = Math.max(0, subtotalCents + taxCents - discountCents + tipCents);
  const dinerCharge = useMemo(() => computeDinerCharge(baseTotalCents), [baseTotalCents]);

  const handlePay = useCallback(async () => {
    if (!order || paying) return;
    setPaying(true);
    try {
      const tipAmount = tipCents / 100;
      const result = await chargeOrder({ order_id: order.id, tip_amount: tipAmount });
      setSuccess(result);
    } catch (err) {
      const nextAction = readNextActionFromError(err);
      if (nextAction) {
        // SCA challenge — let Stripe drive the 3DS sheet, then re-issue the
        // charge. The same idempotency key on the server-side stripe call
        // makes the retry safe (Stripe dedupes to the same PI).
        try {
          const handle = await handleNextAction(nextAction.clientSecret);
          if (handle.error) {
            throw new Error(friendlyError(handle.error, 'Verification failed. Please try again.'));
          }
          const retry = await chargeOrder({ order_id: order.id, tip_amount: tipCents / 100 });
          setSuccess(retry);
        } catch (retryErr) {
          Alert.alert('Pay bill', friendlyError(retryErr, 'Couldn’t complete the payment after verification.'));
        }
      } else {
        Alert.alert('Pay bill', friendlyError(err, 'Couldn’t charge your card. Please try a different one in Account → Payment.'));
      }
    } finally {
      setPaying(false);
    }
  }, [order, paying, tipCents, handleNextAction]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Pay your bill</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Pay your bill</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.emptyText}>We couldn’t find that bill. Ask your server for a fresh QR or link.</Text>
      </View>
    );
  }

  if (order.paid_at || order.status === 'paid') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Pay your bill</Text>
          <View style={{ width: 40 }} />
        </View>
        <Card style={styles.card}>
          <Text style={styles.label}>This bill is already paid. Thanks!</Text>
        </Card>
      </View>
    );
  }

  if (success) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.title}>Receipt</Text>
          <View style={{ width: 40 }} />
        </View>
        <Card style={styles.card}>
          <View style={{ alignItems: 'center', gap: 8, paddingBottom: 6 }}>
            <Ionicons name="checkmark-circle" size={48} color={c.success} />
            <Text style={[styles.totalLabel, { textAlign: 'center' }]}>Bill paid</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Paid total</Text>
            <Text style={styles.value}>{formatCents(Math.round(success.total_charged * 100))}</Text>
          </View>
          {typeof success.processing_fee === 'number' && success.processing_fee > 0 ? (
            <View style={styles.row}>
              <Text style={styles.label}>Processing fee</Text>
              <Text style={styles.value}>{formatCents(Math.round(success.processing_fee * 100))}</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.label}>Tip</Text>
            <Text style={styles.value}>{formatCents(Math.round((success.tip_amount ?? 0) * 100))}</Text>
          </View>
        </Card>
        <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
          <Button title="Done" onPress={() => router.replace('/(customer)/activity')} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <View style={{ width: 40 }} />
      </View>
      <Text style={styles.title}>Pay your bill</Text>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Subtotal</Text>
            <Text style={styles.value}>{formatCents(subtotalCents)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tax</Text>
            <Text style={styles.value}>{formatCents(taxCents)}</Text>
          </View>
          {discountCents > 0 ? (
            <View style={styles.row}>
              <Text style={styles.label}>Discount</Text>
              <Text style={styles.value}>−{formatCents(discountCents)}</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.label}>Tip</Text>
            <Text style={styles.value}>{formatCents(tipCents)}</Text>
          </View>
          {dinerCharge.processingFeeCents > 0 ? (
            <View style={styles.row}>
              <Text style={styles.label}>Processing fee</Text>
              <Text style={styles.value}>{formatCents(dinerCharge.processingFeeCents)}</Text>
            </View>
          ) : null}
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.totalLabel}>You pay</Text>
            <Text style={styles.totalValue}>{formatCents(dinerCharge.dinerTotalCents)}</Text>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Add a tip</Text>
        <View style={styles.tipRow}>
          {TIP_PRESETS.map((p) => {
            const on = tip.kind === 'percent' && tip.value === p;
            return (
              <TouchableOpacity
                key={p}
                style={[styles.tipChip, on && styles.tipChipOn]}
                onPress={() => setTip({ kind: 'percent', value: p })}
              >
                <Text style={[styles.tipChipLabel, on && styles.tipChipLabelOn]}>{p}%</Text>
                <Text style={styles.tipChipSub}>{formatCents(Math.round(subtotalCents * (p / 100)))}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[styles.tipChip, tip.kind === 'none' && styles.tipChipOn]}
            onPress={() => setTip({ kind: 'none' })}
          >
            <Text style={[styles.tipChipLabel, tip.kind === 'none' && styles.tipChipLabelOn]}>None</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.feeNote}>
          {dinerCharge.dinerPaysFee
            ? 'Small-charge processing fee is added so we cover Stripe’s 2.9% + $0.30. Larger tabs absorb it automatically.'
            : 'Stripe’s processing fee is covered by Cenaiva — what you see is what you pay.'}
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          title={paying ? 'Charging…' : `Pay ${formatCents(dinerCharge.dinerTotalCents)}`}
          onPress={handlePay}
          disabled={paying || baseTotalCents <= 0}
        />
        <Text style={styles.secureText}>
          <Ionicons name="lock-closed" size={12} color={c.textMuted} /> Secured by Stripe. Card on file in Account → Payment.
        </Text>
      </View>
    </View>
  );
}
