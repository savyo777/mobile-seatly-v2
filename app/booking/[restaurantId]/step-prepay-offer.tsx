import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { mockRestaurants as DEMO_RESTAURANTS } from '@/lib/mock/restaurants';
import { isDemoModeEnabled } from '@/lib/config/demoMode';

const mockRestaurants: typeof DEMO_RESTAURANTS = isDemoModeEnabled() ? DEMO_RESTAURANTS : [];
import { parseDateKeyLocal } from '@/lib/booking/dateUtils';
import { parseBookingCartParam } from '@/lib/booking/publicBookingApi';
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
  preorderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  preorderLabel: { fontSize: 14, color: c.textSecondary },
  preorderValue: { fontSize: 15, fontWeight: '700', color: c.gold },
  itemList: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  itemRowFirst: { borderTopWidth: 0 },
  itemQty: {
    fontSize: 13,
    fontWeight: '700',
    color: c.gold,
    minWidth: 28,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    color: c.textPrimary,
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: 14,
    color: c.textPrimary,
    fontWeight: '600',
  },
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
  const { restaurantId, date, time, partySize, occasion, notes, cartTotal, cartCount, cart } =
    useLocalSearchParams<{
      restaurantId: string;
      date?: string;
      time?: string;
      partySize?: string;
      occasion?: string;
      notes?: string;
      cartTotal?: string;
      cartCount?: string;
      cart?: string;
    }>();

  const restaurant = mockRestaurants.find((r) => r.id === restaurantId);
  const cartItems = useMemo(() => parseBookingCartParam(cart), [cart]);
  const preorderAmount = useMemo(() => {
    const fromItems = cartItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    return fromItems > 0 ? fromItems : parseFloat(cartTotal ?? '0') || 0;
  }, [cartItems, cartTotal]);
  const preorderSkuCount = cartItems.length || parseInt(cartCount ?? '0', 10) || 0;

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
  const [itemsExpanded, setItemsExpanded] = useState(false);

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
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: itemsExpanded }}
                onPress={() => cartItems.length > 0 && setItemsExpanded((v) => !v)}
                style={styles.preorderLine}
                disabled={cartItems.length === 0}
                hitSlop={8}
              >
                <View style={styles.preorderLeft}>
                  <Text style={styles.preorderLabel}>
                    Pre-order ({preorderSkuCount} {preorderSkuCount === 1 ? 'item' : 'items'})
                  </Text>
                  {cartItems.length > 0 ? (
                    <Ionicons
                      name={itemsExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={c.textSecondary}
                    />
                  ) : null}
                </View>
                <Text style={styles.preorderValue}>{formatCurrency(preorderAmount)}</Text>
              </Pressable>
              {itemsExpanded && cartItems.length > 0 ? (
                <View style={styles.itemList}>
                  {cartItems.map((item, index) => (
                    <View
                      key={`${item.menu_item_id ?? item.name}-${index}`}
                      style={[styles.itemRow, index === 0 && styles.itemRowFirst]}
                    >
                      <Text style={styles.itemQty}>{item.quantity}×</Text>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={styles.itemPrice}>
                        {formatCurrency(item.unit_price * item.quantity)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
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
