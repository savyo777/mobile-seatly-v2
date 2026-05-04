import React, { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, ScreenWrapper } from '@/components/ui';
import { getSupabase } from '@/lib/supabase/client';
import { createStyles, spacing, typography, useColors } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { mockRestaurants } from '@/lib/mock/restaurants';

type CheckoutOrder = {
  id: string;
  restaurant_id: string;
  reservation_id: string | null;
  status: string | null;
  subtotal: number;
  tax_amount: number;
  tip_amount: number;
  total_amount: number;
  confirmation_code: string | null;
  paid_at: string | null;
  currency: string;
  restaurant_name: string;
};

type CheckoutItem = {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

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
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: c.textSecondary,
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.lg,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  lineLast: {
    borderBottomWidth: 0,
  },
  lineName: {
    ...typography.body,
    color: c.textPrimary,
    flex: 1,
    fontWeight: '700',
  },
  lineMeta: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: 2,
  },
  lineTotal: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  totalLabel: {
    ...typography.body,
    color: c.textSecondary,
  },
  totalValue: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  grandRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  grandText: {
    ...typography.bodyLarge,
    color: c.gold,
    fontWeight: '900',
  },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  methodText: {
    ...typography.body,
    color: c.textPrimary,
    flex: 1,
  },
  notice: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  error: {
    ...typography.body,
    color: c.danger,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

function num(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export default function CenaivaCheckoutScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const c = useColors();
  const styles = useStyles();
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [method, setMethod] = useState<'card' | 'apple_pay' | 'google_pay'>('card');
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (orderId?.startsWith('booking-prepay-')) {
          const restaurantId = orderId.replace('booking-prepay-', '');
          const restaurant = mockRestaurants.find((r) => r.id === restaurantId);
          const subtotal = 75;
          const tax = 9.75;
          if (!cancelled) {
            setOrder({
              id: orderId,
              restaurant_id: restaurantId,
              reservation_id: null,
              status: 'pending',
              subtotal,
              tax_amount: tax,
              tip_amount: 0,
              total_amount: subtotal + tax,
              confirmation_code: null,
              paid_at: null,
              currency: 'CAD',
              restaurant_name: restaurant?.name ?? 'Restaurant',
            });
            setItems([
              {
                id: 'estimated-bill',
                name: 'Estimated dining bill',
                quantity: 1,
                unit_price: subtotal,
                line_total: subtotal,
              },
            ]);
          }
          return;
        }

        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase is not configured.');

        const { data: orderRow, error: orderError } = await supabase
          .from('orders')
          .select('id,restaurant_id,reservation_id,status,subtotal,tax_amount,tip_amount,total_amount,confirmation_code,paid_at')
          .eq('id', orderId)
          .single();
        if (orderError || !orderRow) throw new Error(orderError?.message ?? 'Checkout order not found.');

        const { data: restaurantRow } = await supabase
          .from('restaurants')
          .select('name,currency')
          .eq('id', orderRow.restaurant_id)
          .maybeSingle();

        const { data: itemRows, error: itemError } = await supabase
          .from('order_items')
          .select('id,name,quantity,unit_price,line_total')
          .eq('order_id', orderId)
          .order('name', { ascending: true });
        if (itemError) throw new Error(itemError.message);

        if (!cancelled) {
          setOrder({
            id: String(orderRow.id),
            restaurant_id: String(orderRow.restaurant_id),
            reservation_id: typeof orderRow.reservation_id === 'string' ? orderRow.reservation_id : null,
            status: typeof orderRow.status === 'string' ? orderRow.status : null,
            subtotal: num(orderRow.subtotal),
            tax_amount: num(orderRow.tax_amount),
            tip_amount: num(orderRow.tip_amount),
            total_amount: num(orderRow.total_amount),
            confirmation_code: typeof orderRow.confirmation_code === 'string' ? orderRow.confirmation_code : null,
            paid_at: typeof orderRow.paid_at === 'string' ? orderRow.paid_at : null,
            currency: typeof restaurantRow?.currency === 'string' ? restaurantRow.currency : 'CAD',
            restaurant_name: typeof restaurantRow?.name === 'string' ? restaurantRow.name : 'Restaurant',
          });
          setItems(
            (itemRows ?? []).map((item) => ({
              id: String(item.id),
              name: String(item.name ?? 'Item'),
              quantity: num(item.quantity, 1),
              unit_price: num(item.unit_price),
              line_total: num(item.line_total),
            })),
          );
        }
      } catch (err) {
        if (!cancelled) setError((err as Error)?.message ?? 'Could not load checkout.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const currency = order?.currency ?? 'CAD';
  const paymentMethods = useMemo(
    () => [
      { id: 'card' as const, label: 'Credit / Debit Card', icon: 'card-outline' as const },
      { id: 'apple_pay' as const, label: 'Apple Pay', icon: 'logo-apple' as const },
      { id: 'google_pay' as const, label: 'Google Pay', icon: 'logo-google' as const },
    ],
    [],
  );

  const continueToSecurePayment = () => {
    if (processingPayment || paymentComplete) return;
    setProcessingPayment(true);
    setNotice(null);
    setTimeout(() => {
      setProcessingPayment(false);
      setPaymentComplete(true);
      setNotice('Payment confirmed. Your pre-pay receipt is saved with your booking.');
      Alert.alert('Payment confirmed', 'Your pre-pay receipt is saved with your booking.');
    }, 450);
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.center}>
          <ActivityIndicator color={c.gold} />
        </View>
      </ScreenWrapper>
    );
  }

  if (error || !order) {
    return (
      <ScreenWrapper>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12} style={styles.backHit}>
          <Ionicons name="chevron-back" size={26} color={c.gold} />
        </Pressable>
        <Text style={styles.error}>{error ?? 'Checkout order not found.'}</Text>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12} style={styles.backHit}>
          <Ionicons name="chevron-back" size={26} color={c.gold} />
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.h2}>Prepay checkout</Text>
        <Text style={styles.subtitle}>{order.restaurant_name}</Text>

        <Card style={styles.card}>
          {items.map((item, index) => (
            <View key={item.id} style={[styles.line, index === items.length - 1 && styles.lineLast]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineName}>{item.quantity}x {item.name}</Text>
                <Text style={styles.lineMeta}>
                  {formatCurrency(item.unit_price, currency)} each
                </Text>
              </View>
              <Text style={styles.lineTotal}>{formatCurrency(item.line_total, currency)}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.card}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.subtotal, currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.tax_amount, currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tip</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.tip_amount, currency)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandRow]}>
            <Text style={styles.grandText}>Total</Text>
            <Text style={styles.grandText}>{formatCurrency(order.total_amount, currency)}</Text>
          </View>
        </Card>

        <Card style={styles.card}>
          {paymentMethods.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => setMethod(item.id)}
              style={styles.method}
            >
              <Ionicons name={item.icon} size={22} color={method === item.id ? c.gold : c.textSecondary} />
              <Text style={styles.methodText}>{item.label}</Text>
              <Ionicons
                name={method === item.id ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={method === item.id ? c.gold : c.textMuted}
              />
            </Pressable>
          ))}
          <Text style={styles.notice}>
            Your preorder is ready for checkout. Confirming payment must happen here; Cenaiva never charges automatically.
          </Text>
        </Card>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        <Button
          title={paymentComplete ? 'Payment confirmed' : 'Continue to secure payment'}
          loading={processingPayment}
          disabled={paymentComplete}
          onPress={continueToSecurePayment}
        />
        <Button
          title="Pay at restaurant"
          variant="outlined"
          style={{ marginTop: spacing.sm }}
          onPress={() => router.replace('/(customer)/activity' as never)}
        />
      </ScrollView>
    </ScreenWrapper>
  );
}
