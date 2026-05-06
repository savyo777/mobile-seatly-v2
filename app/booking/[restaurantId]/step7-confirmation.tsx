import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import {
  getCachedRestaurantById,
  loadRestaurantForBooking,
} from '@/lib/data/restaurantCatalog';
import { parseDateKeyLocal } from '@/lib/booking/dateUtils';
import {
  cartSubtotal,
  createPublicBooking,
  parseBookingCartParam,
  type PublicBookingResponse,
} from '@/lib/booking/publicBookingApi';
import { useColors, createStyles, spacing, borderRadius, shadows } from '@/lib/theme';
import type { DateKey } from '@/lib/booking/availabilityTypes';

const useStyles = createStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bgBase },
  body: {
    paddingHorizontal: 20,
    paddingTop: 32,
    gap: 20,
  },

  // Success
  successSection: {
    alignItems: 'center',
    gap: 10,
  },
  checkCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: c.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    ...shadows.goldGlow,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: c.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: c.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Summary card
  summaryCard: {
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
  },
  summaryText: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textPrimary,
  },

  // Code
  codeWrap: { alignItems: 'center', gap: 8 },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeBox: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgSurface,
    borderWidth: 1.5,
    borderColor: c.gold,
  },
  codeText: {
    fontSize: 22,
    fontWeight: '700',
    color: c.gold,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 3,
  },

  // Upsell
  upsellHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  upsellIntro: {
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  upsellCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: c.bgSurface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: borderRadius.xl,
    padding: 16,
  },
  upsellIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upsellBody: { flex: 1, gap: 3 },
  upsellTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
  },
  upsellDesc: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
  },

  // Done
  doneWrap: { gap: 12 },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: c.danger,
    textAlign: 'center',
    lineHeight: 20,
  },
  skipBtn: { alignItems: 'center', paddingVertical: 4 },
  skipText: {
    fontSize: 14,
    color: c.textMuted,
    fontWeight: '500',
  },
}));

export default function Step7Confirmation() {
  const {
    restaurantId,
    date,
    time,
    partySize,
    occasion,
    notes,
    shiftId,
    slotDateTime,
    name,
    email,
    phone,
    seatingPreference,
    paymentMethod,
    cart: cartParam,
  } = useLocalSearchParams<{
    restaurantId: string;
    date: string;
    time: string;
    partySize: string;
    occasion: string;
    notes?: string;
    shiftId?: string;
    slotDateTime?: string;
    name?: string;
    email?: string;
    phone?: string;
    seatingPreference?: string;
    paymentMethod?: string;
    cart?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const rid = restaurantId ?? '';

  const [restaurant, setRestaurant] = useState(() => getCachedRestaurantById(rid));
  const [confirmation, setConfirmation] = useState<PublicBookingResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const guests = parseInt(partySize ?? '2', 10);
  const savedReservationRef = useRef(false);
  const cart = parseBookingCartParam(cartParam);
  const preorderSubtotal = cartSubtotal(cart);

  const dateLabel = (() => {
    try {
      return parseDateKeyLocal(date as DateKey).toLocaleDateString(undefined, {
        weekday: 'long', month: 'long', day: 'numeric',
      });
    } catch { return date ?? ''; }
  })();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    let cancelled = false;

    async function submitBooking() {
      if (savedReservationRef.current || !rid) return;
      const loaded = await loadRestaurantForBooking(rid);
      if (cancelled) return;
      const currentRestaurant = loaded ?? getCachedRestaurantById(rid);
      setRestaurant(currentRestaurant);
      if (!currentRestaurant) return;
      if (!shiftId || !slotDateTime || !name || !email) {
        savedReservationRef.current = true;
        Alert.alert(
          'Missing booking details',
          'Please choose an available time and enter your guest details.',
        );
        router.replace(`/booking/${rid}/step2-time`);
        return;
      }

      savedReservationRef.current = true;
      setSubmitError(null);
      try {
        const taxAmount = Math.round(preorderSubtotal * currentRestaurant.taxRate * 100) / 100;
        const result = await createPublicBooking({
          restaurant_id: rid,
          shift_id: shiftId,
          date_time: slotDateTime,
          party_size: guests,
          guest_name: name,
          guest_email: email,
          guest_phone: phone || null,
          allergies: notes || null,
          seating_preference: seatingPreference || null,
          occasion: occasion || null,
          cart_items: cart,
          subtotal: preorderSubtotal,
          tax_amount: taxAmount,
          tip_amount: 0,
          total_amount: Math.round((preorderSubtotal + taxAmount) * 100) / 100,
          discount_amount: null,
          discount_reason: null,
          promotion_id: null,
          payment_method: paymentMethod === 'split' ? 'split' : 'card',
        });
        if (!cancelled) setConfirmation(result);
      } catch (error) {
        const status = (error as Error & { status?: number }).status;
        const message = error instanceof Error ? error.message : 'Reservation failed.';
        if (!cancelled) {
          setSubmitError(message);
          if (status === 409) {
            Alert.alert('Time no longer available', message, [
              { text: 'Choose another time', onPress: () => router.replace(`/booking/${rid}/step2-time?date=${encodeURIComponent(date ?? '')}`) },
            ]);
          }
        }
      }
    }

    submitBooking();
    return () => {
      cancelled = true;
    };
  }, [cart, date, email, guests, name, notes, occasion, paymentMethod, phone, preorderSubtotal, rid, router, seatingPreference, shiftId, slotDateTime]);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 55,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();
  }, [fadeAnim, scaleAnim, slideAnim]);

  if (!confirmation) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={[styles.body, styles.loadingBox, { paddingBottom: insets.bottom + 32 }]}>
          {submitError ? (
            <>
              <Ionicons name="alert-circle-outline" size={42} color={c.danger} />
              <Text style={styles.errorText}>{submitError}</Text>
              <Button title="Choose another time" onPress={() => router.replace(`/booking/${rid}/step2-time?date=${encodeURIComponent(date ?? '')}`)} />
            </>
          ) : (
            <>
              <ActivityIndicator color={c.gold} />
              <Text style={styles.loadingText}>Confirming your reservation...</Text>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* Success badge */}
        <View style={styles.successSection}>
          <Animated.View style={[styles.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
            <Ionicons name="checkmark" size={44} color={c.bgBase} />
          </Animated.View>
          <Animated.Text style={[styles.title, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            You're all set!
          </Animated.Text>
          <Animated.Text style={[styles.subtitle, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {restaurant?.name}
          </Animated.Text>
        </View>

        {/* Booking summary */}
        <Animated.View style={[styles.summaryCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.summaryRow}>
            <Ionicons name="calendar-outline" size={16} color={c.gold} />
            <Text style={styles.summaryText}>{dateLabel}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Ionicons name="time-outline" size={16} color={c.gold} />
            <Text style={styles.summaryText}>{time}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Ionicons name="people-outline" size={16} color={c.gold} />
            <Text style={styles.summaryText}>{guests} {guests === 1 ? 'guest' : 'guests'}</Text>
          </View>
          {occasion ? (
            <>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Ionicons name="sparkles-outline" size={16} color={c.gold} />
                <Text style={styles.summaryText}>{occasion}</Text>
              </View>
            </>
          ) : null}
        </Animated.View>

        {/* Confirmation code */}
        <Animated.View style={[styles.codeWrap, { opacity: fadeAnim }]}>
          <Text style={styles.codeLabel}>Confirmation code</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{confirmation.confirmation_code}</Text>
          </View>
        </Animated.View>

        {/* Confirmation delivery */}
        <Animated.View style={[{ opacity: fadeAnim }]}>
          <Text style={styles.upsellHeading}>Confirmation</Text>
          <Text style={styles.upsellIntro}>
            {confirmation.reused
              ? 'We found your existing matching reservation and reused it.'
              : confirmation.confirmation_delivery === 'sent'
                ? `Confirmation sent by ${confirmation.confirmation_delivery_channel ?? 'message'}.`
                : 'Your reservation is confirmed. Keep this code for check-in.'}
          </Text>
        </Animated.View>

        {/* Done */}
        <Animated.View style={[styles.doneWrap, { opacity: fadeAnim }]}>
          <Button
            title="View my bookings"
            onPress={() => { router.dismissAll(); router.navigate('/(customer)/activity'); }}
          />
          <Pressable onPress={() => { router.dismissAll(); router.navigate('/(customer)/discover'); }} style={styles.skipBtn}>
            <Text style={styles.skipText}>Back to explore</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
