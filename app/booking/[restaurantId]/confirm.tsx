import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui';
import { BookingCalendarModal } from '@/components/booking/BookingCalendarModal';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { parseDateKeyLocal } from '@/lib/booking/dateUtils';
import { colors, spacing, borderRadius } from '@/lib/theme';
import type { DateKey } from '@/lib/booking/availabilityTypes';

const OCCASIONS = ['Birthday', 'Anniversary', 'Date Night', 'Business', 'Celebration'];

export default function ConfirmScreen() {
  const { restaurantId, date, time, partySize } = useLocalSearchParams<{
    restaurantId: string;
    date: string;
    time: string;
    partySize: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [dateKey, setDateKey] = useState<DateKey>((date ?? '') as DateKey);
  const [guests, setGuests] = useState(parseInt(partySize ?? '2', 10));
  const [occasion, setOccasion] = useState('');
  const [notes, setNotes] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const restaurant = mockRestaurants.find((r) => r.id === restaurantId);

  const dateLabel = useMemo(() => {
    try {
      return parseDateKeyLocal(dateKey).toLocaleDateString(undefined, {
        weekday: 'long', month: 'long', day: 'numeric',
      });
    } catch { return dateKey; }
  }, [dateKey]);

  const handleConfirm = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace(
      `/booking/${restaurantId}/step7-confirmation?date=${encodeURIComponent(dateKey)}&time=${encodeURIComponent(time ?? '')}&partySize=${guests}&occasion=${encodeURIComponent(occasion)}&notes=${encodeURIComponent(notes)}`,
    );
  }, [restaurantId, dateKey, time, guests, occasion, notes, router]);

  const adjustGuests = useCallback((delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGuests((g) => Math.max(1, Math.min(20, g + delta)));
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Reservation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 110 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Restaurant hero */}
        {restaurant?.coverPhotoUrl ? (
          <View style={styles.heroWrap}>
            <Image source={{ uri: restaurant.coverPhotoUrl }} style={styles.hero} />
            <View style={styles.heroOverlay} />
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroName}>{restaurant.name}</Text>
              <Text style={styles.heroCuisine}>{restaurant.cuisineType} · {'★'} {restaurant.avgRating.toFixed(1)}</Text>
            </View>
          </View>
        ) : null}

        {/* Booking details — each row tappable */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsHeading}>Your reservation</Text>

          {/* Date */}
          <Pressable style={styles.detailRow} onPress={() => setCalendarOpen(true)}>
            <View style={styles.detailIcon}>
              <Ionicons name="calendar-outline" size={18} color={colors.gold} />
            </View>
            <View style={styles.detailBody}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{dateLabel}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>

          <View style={styles.rowDivider} />

          {/* Time */}
          <Pressable style={styles.detailRow} onPress={() => router.back()}>
            <View style={styles.detailIcon}>
              <Ionicons name="time-outline" size={18} color={colors.gold} />
            </View>
            <View style={styles.detailBody}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>{time}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>

          <View style={styles.rowDivider} />

          {/* Guests — inline stepper */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="people-outline" size={18} color={colors.gold} />
            </View>
            <View style={styles.detailBody}>
              <Text style={styles.detailLabel}>Guests</Text>
              <Text style={styles.detailValue}>{guests} {guests === 1 ? 'guest' : 'guests'}</Text>
            </View>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => adjustGuests(-1)}
                disabled={guests <= 1}
                style={[styles.stepperBtn, guests <= 1 && styles.stepperBtnDisabled]}
              >
                <Ionicons name="remove" size={16} color={guests <= 1 ? colors.textMuted : colors.textPrimary} />
              </Pressable>
              <Text style={styles.stepperCount}>{guests}</Text>
              <Pressable
                onPress={() => adjustGuests(1)}
                disabled={guests >= 20}
                style={[styles.stepperBtn, guests >= 20 && styles.stepperBtnDisabled]}
              >
                <Ionicons name="add" size={16} color={guests >= 20 ? colors.textMuted : colors.textPrimary} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Occasion */}
        <Text style={styles.sectionLabel}>
          Occasion <Text style={styles.optional}>(optional)</Text>
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {OCCASIONS.map((o) => (
            <Pressable
              key={o}
              onPress={() => setOccasion(occasion === o ? '' : o)}
              style={[styles.chip, occasion === o && styles.chipSelected]}
            >
              <Text style={[styles.chipText, occasion === o && styles.chipTextSelected]}>{o}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Special requests */}
        <Text style={styles.sectionLabel}>
          Special requests <Text style={styles.optional}>(optional)</Text>
        </Text>
        <TextInput
          style={styles.textInput}
          placeholder="Allergies, seating preferences, celebrations…"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
          textAlignVertical="top"
        />

        {/* Policy */}
        <View style={styles.policyRow}>
          <Ionicons name="shield-checkmark-outline" size={15} color={colors.textMuted} />
          <Text style={styles.policyText}>Free cancellation up to 24 hours before your reservation.</Text>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button title="Confirm Reservation" onPress={handleConfirm} />
      </View>

      <BookingCalendarModal
        visible={calendarOpen}
        restaurantId={restaurantId ?? ''}
        selectedDateKey={dateKey}
        onClose={() => setCalendarOpen(false)}
        onSelect={(k) => { setDateKey(k); setCalendarOpen(false); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },

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
    color: colors.textPrimary,
  },

  body: { gap: 14 },

  // Hero
  heroWrap: {
    position: 'relative',
    height: 180,
    marginHorizontal: 20,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  hero: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  heroTextWrap: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  heroCuisine: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },

  // Details card
  detailsCard: {
    marginHorizontal: 20,
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  detailsHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 52,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(201,162,74,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBody: { flex: 1 },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // Inline guest stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: { opacity: 0.35 },
  stepperCount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },

  // Occasion
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
  },
  optional: { fontSize: 10, fontWeight: '400', textTransform: 'none' },
  chipRow: { gap: 8, paddingHorizontal: 20, paddingBottom: 2 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextSelected: { color: colors.bgBase },

  // Notes
  textInput: {
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginHorizontal: 20,
    color: colors.textPrimary,
    fontSize: 14,
    minHeight: 80,
  },

  // Policy
  policyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  policyText: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.bgBase,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
