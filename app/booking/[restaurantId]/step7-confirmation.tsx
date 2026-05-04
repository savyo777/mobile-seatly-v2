import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { addMockReservation } from '@/lib/mock/reservations';
import { mockCustomer } from '@/lib/mock/users';
import { parseDateKeyLocal } from '@/lib/booking/dateUtils';
import { useColors, createStyles, spacing, borderRadius, shadows } from '@/lib/theme';
import type { DateKey } from '@/lib/booking/availabilityTypes';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SEAT-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function reservationDateTimeIso(dateKey?: string, timeLabel?: string): string {
  const base = dateKey ? parseDateKeyLocal(dateKey as DateKey) : new Date();
  const match = timeLabel?.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return base.toISOString();
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2] ?? '0', 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  base.setHours(hour, minute, 0, 0);
  return base.toISOString();
}

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
  upsellCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: c.bgSurface,
    borderWidth: 1,
    borderColor: c.border,
    borderBottomWidth: 0,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: 16,
  },
  upsellCardLast: {
    borderBottomWidth: 1,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
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
  skipBtn: { alignItems: 'center', paddingVertical: 4 },
  skipText: {
    fontSize: 14,
    color: c.textMuted,
    fontWeight: '500',
  },
}));

export default function Step7Confirmation() {
  const { restaurantId, date, time, partySize, occasion, notes } = useLocalSearchParams<{
    restaurantId: string;
    date: string;
    time: string;
    partySize: string;
    occasion: string;
    notes?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();

  const restaurant = mockRestaurants.find((r) => r.id === restaurantId);
  const guests = parseInt(partySize ?? '2', 10);
  const confirmationCode = useRef(generateCode()).current;
  const savedReservationRef = useRef(false);

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
    if (!savedReservationRef.current && restaurant) {
      savedReservationRef.current = true;
      addMockReservation({
        id: `res-${confirmationCode.toLowerCase()}`,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        guestId: mockCustomer.id,
        partySize: guests,
        reservedAt: reservationDateTimeIso(date, time),
        status: 'confirmed',
        source: 'app',
        confirmationCode,
        occasion: occasion || undefined,
        specialRequest: notes || undefined,
        guestName: mockCustomer.fullName,
        depositAmount: 25,
      });
    }

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
  }, [confirmationCode, date, guests, notes, occasion, restaurant, time]);

  const navigateToPreorder = () => {
    router.push(
      `/booking/${restaurantId}/step4-preorder?date=${encodeURIComponent(date ?? '')}&time=${encodeURIComponent(time ?? '')}&partySize=${partySize}&occasion=${encodeURIComponent(occasion ?? '')}&notes=${encodeURIComponent(notes ?? '')}`,
    );
  };

  const navigateToPrepay = () => {
    router.push(`/checkout/booking-prepay-${restaurantId}` as never);
  };

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
            <Text style={styles.codeText}>{confirmationCode}</Text>
          </View>
        </Animated.View>

        {/* Upsell divider */}
        <Animated.View style={[{ opacity: fadeAnim }]}>
          <Text style={styles.upsellHeading}>Make it even better</Text>

          {/* Pre-order meals */}
          <Pressable
            style={({ pressed }) => [styles.upsellCard, pressed && { opacity: 0.88 }]}
            onPress={navigateToPreorder}
          >
            <View style={[styles.upsellIconWrap, { backgroundColor: 'rgba(201,162,74,0.12)' }]}>
              <Ionicons name="restaurant-outline" size={24} color={c.gold} />
            </View>
            <View style={styles.upsellBody}>
              <Text style={styles.upsellTitle}>Pre-order your meal</Text>
              <Text style={styles.upsellDesc}>
                Browse the menu and choose your dishes — they'll be ready when you arrive.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </Pressable>

          {/* Pre-pay */}
          <Pressable
            style={({ pressed }) => [styles.upsellCard, styles.upsellCardLast, pressed && { opacity: 0.88 }]}
            onPress={navigateToPrepay}
          >
            <View style={[styles.upsellIconWrap, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
              <Ionicons name="card-outline" size={24} color={c.success} />
            </View>
            <View style={styles.upsellBody}>
              <Text style={styles.upsellTitle}>Pre-pay your bill</Text>
              <Text style={styles.upsellDesc}>
                Skip the check at the end of the night — pay now and just enjoy.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </Pressable>
        </Animated.View>

        {/* Done */}
        <Animated.View style={[styles.doneWrap, { opacity: fadeAnim }]}>
          <Button
            title="View my bookings"
            onPress={() => router.replace('/(customer)/activity')}
          />
          <Pressable onPress={() => router.replace('/(customer)/discover')} style={styles.skipBtn}>
            <Text style={styles.skipText}>Back to explore</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
