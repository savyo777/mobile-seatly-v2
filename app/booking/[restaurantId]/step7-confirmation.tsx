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
  confirmDepositStub,
  createPublicBooking,
  parseBookingCartParam,
  prepareDeposit,
  type PublicBookingResponse,
} from '@/lib/booking/publicBookingApi';
import { previewDepositCents } from '@/lib/booking/depositTiers';
import { addBookingToCalendar } from '@/lib/booking/addToCalendar';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { useColors, createStyles, spacing, borderRadius, shadows } from '@/lib/theme';
import type { DateKey } from '@/lib/booking/availabilityTypes';
import { useReservationHoldContext } from '@/lib/booking/ReservationHoldProvider';
import { isHoldsEnabled } from '@/lib/config/holdsFeature';

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

  // Calendar action
  calendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: c.gold,
    backgroundColor: 'rgba(201,162,74,0.08)',
  },
  calendarBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.gold,
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
  depositBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  depositBannerWarning: {
    backgroundColor: 'rgba(212, 165, 116, 0.10)',
    borderColor: c.warning,
  },
  depositBannerSuccess: {
    backgroundColor: 'rgba(201, 162, 74, 0.10)',
    borderColor: c.gold,
  },
  depositBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: c.textPrimary,
  },
  policySection: {
    gap: 6,
    paddingHorizontal: 4,
  },
  policyHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  policyLine: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textSecondary,
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
    paid: paidParam,
    reservationId: paidReservationId,
    confirmationCode: paidConfirmationCode,
    tableIds: paidTableIdsParam,
    durationMinutes: paidDurationMinutesParam,
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
    paid?: string;
    reservationId?: string;
    confirmationCode?: string;
    tableIds?: string;
    durationMinutes?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const rid = restaurantId ?? '';

  const hold = useReservationHoldContext();
  const alreadyPaid = paidParam === '1' && Boolean(paidReservationId) && Boolean(paidConfirmationCode);
  const initialConfirmation = alreadyPaid
    ? ({
        reservation_id: paidReservationId!,
        order_id: null,
        confirmation_code: paidConfirmationCode!,
        table_ids: paidTableIdsParam ? paidTableIdsParam.split(',').filter(Boolean) : [],
        duration_minutes: paidDurationMinutesParam ? parseInt(paidDurationMinutesParam, 10) || null : null,
        confirmation_delivery: 'skipped',
        confirmation_delivery_channel: null,
        deposit_required: true,
        deposit_amount_cents: 0,
        deposit_status: 'charged',
      } as PublicBookingResponse)
    : null;
  const [restaurant, setRestaurant] = useState(() => getCachedRestaurantById(rid));
  const [confirmation, setConfirmation] = useState<PublicBookingResponse | null>(initialConfirmation);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [calendarAdding, setCalendarAdding] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [depositPendingError, setDepositPendingError] = useState<string | null>(null);
  const guests = parseInt(partySize ?? '2', 10);
  const savedReservationRef = useRef(alreadyPaid);
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
      let currentRestaurant = restaurant ?? getCachedRestaurantById(rid);
      if (!currentRestaurant) {
        const loaded = await loadRestaurantForBooking(rid);
        if (cancelled) return;
        currentRestaurant = loaded ?? getCachedRestaurantById(rid);
      }
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
        const previewDepositDollars = previewDepositCents(currentRestaurant.depositTiers, guests) / 100;

        // If the user landed on step7 while the hold was still being created
        // (e.g. tapped Skip on step4 within ~200ms of mount), wait briefly for
        // it to materialize. Falls through to the legacy path on timeout.
        if (isHoldsEnabled() && hold.state.status === 'creating') {
          for (let i = 0; i < 30; i++) {
            if (cancelled) return;
            if (hold.state.status !== 'creating') break;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
        const activeHoldId =
          isHoldsEnabled() && hold.state.status === 'active' ? hold.state.holdId : null;
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
          total_amount: Math.round((preorderSubtotal + taxAmount + previewDepositDollars) * 100) / 100,
          discount_amount: null,
          discount_reason: null,
          promotion_id: null,
          payment_method: paymentMethod === 'split' ? 'split' : 'card',
          hold_id: activeHoldId,
        });
        if (cancelled) return;
        setConfirmation(result);
        if (activeHoldId) {
          hold.confirmConverted(result.reservation_id, result.confirmation_code);
        }

        // STRIPE STUB — collect the deposit immediately after the booking
        // succeeds. On real Stripe, this becomes a confirmPayment call against
        // the client_secret returned by prepare-deposit.
        if (result.deposit_required && result.deposit_amount_cents && result.deposit_amount_cents > 0) {
          try {
            const { payments } = await prepareDeposit({
              reservation_id: result.reservation_id,
              payers: [{
                email,
                full_name: name,
                amount_cents: result.deposit_amount_cents,
              }],
            });
            for (const payment of payments) {
              if (cancelled) return;
              await confirmDepositStub({ payment_id: payment.id });
            }
          } catch (depositError) {
            if (cancelled) return;
            const message = depositError instanceof Error
              ? depositError.message
              : 'The deposit could not be charged.';
            setDepositPendingError(message);
          }
        }
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
  }, [cart, date, email, guests, name, notes, occasion, paymentMethod, phone, preorderSubtotal, restaurant, rid, router, seatingPreference, shiftId, slotDateTime]);

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

  const handleAddToCalendar = async () => {
    if (!confirmation || !slotDateTime || calendarAdding) return;
    setCalendarAdding(true);
    try {
      const addressParts = restaurant
        ? [restaurant.address, restaurant.city, restaurant.province].filter(Boolean)
        : [];
      await addBookingToCalendar({
        reservationId: confirmation.reservation_id,
        confirmationCode: confirmation.confirmation_code,
        restaurantName: restaurant?.name ?? 'Restaurant',
        restaurantAddress: addressParts.length ? addressParts.join(', ') : null,
        startDateTime: slotDateTime,
        durationMinutes: confirmation.duration_minutes,
        partySize: guests,
        notes: notes ?? null,
      });
      setCalendarAdded(true);
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : 'Could not add to calendar.';
      Alert.alert('Add to calendar', message);
    } finally {
      setCalendarAdding(false);
    }
  };

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

        {/* Deposit banner */}
        {confirmation.deposit_required && confirmation.deposit_amount_cents ? (
          <Animated.View style={[{ opacity: fadeAnim }]}>
            {depositPendingError ? (
              <View style={[styles.depositBanner, styles.depositBannerWarning]}>
                <Ionicons name="alert-circle-outline" size={18} color={c.warning} />
                <Text style={styles.depositBannerText}>
                  We couldn't charge the {formatCurrency(confirmation.deposit_amount_cents / 100)} deposit yet ({depositPendingError}).
                  Pay it from My Bookings before your reservation to keep the table.
                </Text>
              </View>
            ) : (
              <View style={[styles.depositBanner, styles.depositBannerSuccess]}>
                <Ionicons name="checkmark-circle-outline" size={18} color={c.gold} />
                <Text style={styles.depositBannerText}>
                  Deposit of {formatCurrency(confirmation.deposit_amount_cents / 100)} collected.
                </Text>
              </View>
            )}
          </Animated.View>
        ) : null}

        {/* Cancellation / no-show policy */}
        {restaurant && (
          restaurant.cancellationHours != null ||
          (restaurant.noShowFee != null && restaurant.noShowFee > 0) ||
          (!confirmation.deposit_required &&
            ((restaurant.depositTiers && restaurant.depositTiers.length > 0) ||
              (restaurant.depositPolicyJson && Object.keys(restaurant.depositPolicyJson).length > 0)))
        ) ? (
          <Animated.View style={[styles.policySection, { opacity: fadeAnim }]}>
            <Text style={styles.policyHeading}>Cancellation policy</Text>
            {restaurant.cancellationHours != null ? (
              <Text style={styles.policyLine}>
                Cancel at least {restaurant.cancellationHours} {restaurant.cancellationHours === 1 ? 'hour' : 'hours'} ahead to avoid a fee.
              </Text>
            ) : null}
            {restaurant.noShowFee != null && restaurant.noShowFee > 0 ? (
              <Text style={styles.policyLine}>
                No-show fee: {formatCurrency(restaurant.noShowFee)}.
              </Text>
            ) : null}
            {!confirmation.deposit_required &&
              ((restaurant.depositTiers && restaurant.depositTiers.length > 0) ||
                (restaurant.depositPolicyJson && Object.keys(restaurant.depositPolicyJson).length > 0)) ? (
              <Text style={styles.policyLine}>
                Deposit may be required for larger parties or peak times.
              </Text>
            ) : null}
          </Animated.View>
        ) : null}

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

        {/* Add to calendar */}
        <Animated.View style={[{ opacity: fadeAnim }]}>
          <Pressable
            onPress={handleAddToCalendar}
            disabled={calendarAdding || !slotDateTime}
            style={({ pressed }) => [
              styles.calendarBtn,
              pressed && { opacity: 0.7 },
              (calendarAdding || !slotDateTime) && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add reservation to calendar"
          >
            {calendarAdding ? (
              <ActivityIndicator color={c.gold} />
            ) : (
              <Ionicons
                name={calendarAdded ? 'checkmark-circle' : 'calendar-outline'}
                size={18}
                color={c.gold}
              />
            )}
            <Text style={styles.calendarBtnText}>
              {calendarAdding
                ? 'Opening calendar…'
                : calendarAdded
                  ? 'Added to calendar'
                  : 'Add to calendar'}
            </Text>
          </Pressable>
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
