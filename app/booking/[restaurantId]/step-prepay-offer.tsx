import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { parseDateKeyLocal } from '@/lib/booking/dateUtils';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import type { DateKey } from '@/lib/booking/availabilityTypes';

const useStyles = createStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bgBase },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: c.textPrimary,
  },
  body: { paddingHorizontal: 20, paddingTop: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: '800', color: c.textPrimary },
  subtitle: { fontSize: 14, color: c.textSecondary, lineHeight: 20 },
  summaryCard: {
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    gap: 10,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryText: { fontSize: 15, color: c.textPrimary, fontWeight: '500', flex: 1 },
  preorderLine: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: c.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preorderLabel: { fontSize: 14, color: c.textSecondary },
  preorderValue: { fontSize: 15, fontWeight: '700', color: c.gold },
  hint: { fontSize: 13, color: c.textMuted, lineHeight: 19 },
  actions: { gap: 12, marginTop: 8 },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 14, color: c.textMuted, fontWeight: '500' },
}));

export default function StepPrepayOfferScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const { restaurantId, date, time, partySize, occasion, notes, cartTotal, cartCount } =
    useLocalSearchParams<{
      restaurantId: string;
      date?: string;
      time?: string;
      partySize?: string;
      occasion?: string;
      notes?: string;
      cartTotal?: string;
      cartCount?: string;
    }>();

  const restaurant = mockRestaurants.find((r) => r.id === restaurantId);
  const preorderAmount = parseFloat(cartTotal ?? '0') || 0;
  const preorderSkuCount = parseInt(cartCount ?? '0', 10) || 0;

  const dateLabel = useMemo(() => {
    if (!date) return '';
    try {
      return parseDateKeyLocal(date as DateKey).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return date;
    }
  }, [date]);

  const guests = parseInt(partySize ?? '2', 10);

  const goCheckout = () => {
    const q = preorderAmount > 0 ? `?preorderSubtotal=${encodeURIComponent(String(preorderAmount))}` : '';
    router.push(`/checkout/booking-prepay-${restaurantId}${q}` as never);
  };

  const skip = () => {
    router.dismissAll();
    router.navigate('/(customer)/activity');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Optional pre-pay</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 28 }]}
      >
        <Text style={styles.title}>Pay ahead?</Text>
        <Text style={styles.subtitle}>
          After pre-ordering, you can optionally settle part or all of your bill now. Skip if you prefer to pay at the
          restaurant.
        </Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Ionicons name="business-outline" size={18} color={c.gold} />
            <Text style={styles.summaryText}>{restaurant?.name ?? 'Restaurant'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="calendar-outline" size={18} color={c.gold} />
            <Text style={styles.summaryText}>{dateLabel}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="time-outline" size={18} color={c.gold} />
            <Text style={styles.summaryText}>{time}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="people-outline" size={18} color={c.gold} />
            <Text style={styles.summaryText}>
              {guests} {guests === 1 ? 'guest' : 'guests'}
            </Text>
          </View>
          {preorderAmount > 0 ? (
            <View style={styles.preorderLine}>
              <Text style={styles.preorderLabel}>Pre-order ({preorderSkuCount} items)</Text>
              <Text style={styles.preorderValue}>{formatCurrency(preorderAmount)}</Text>
            </View>
          ) : (
            <Text style={[styles.hint, { marginTop: 6 }]}>
              No dishes were added to your pre-order. You can still pre-pay an estimated tab if you like.
            </Text>
          )}
        </View>

        <Text style={styles.hint}>Neither pre-order nor pre-pay is required — your table is already reserved.</Text>

        <View style={styles.actions}>
          <Button title="Pre-pay now" onPress={goCheckout} size="lg" />
          <Pressable onPress={skip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip — I’ll pay at the restaurant</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
