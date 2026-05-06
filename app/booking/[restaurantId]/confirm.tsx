import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui';
import { BookingCalendarModal } from '@/components/booking/BookingCalendarModal';
import {
  getCachedRestaurantById,
  loadRestaurantForBooking,
} from '@/lib/data/restaurantCatalog';
import { parseBookingDateParam, parseDateKeyLocal } from '@/lib/booking/dateUtils';
import { coerceBookableDateKey } from '@/lib/booking/getAvailability';
import { fetchBookingProfile } from '@/lib/booking/publicBookingApi';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import type { DateKey } from '@/lib/booking/availabilityTypes';

const OCCASIONS = ['Birthday', 'Anniversary', 'Date Night', 'Business', 'Celebration'];

const SEATING_OPTIONS = ['Window', 'Booth', 'Outdoor', 'Bar', 'Quiet'];

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

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
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  detailsHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
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
    backgroundColor: c.border,
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
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
  },

  // Guest count
  guestInput: {
    minWidth: 54,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.bgElevated,
    borderWidth: 1,
    borderColor: c.border,
    color: c.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  guestInputError: {
    borderColor: c.danger,
  },
  guestErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.danger,
    marginTop: -8,
    paddingHorizontal: 20,
  },

  // Occasion
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
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
    backgroundColor: c.bgSurface,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipSelected: { backgroundColor: c.gold, borderColor: c.gold },
  chipText: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
  chipTextSelected: { color: c.bgBase },

  // Notes
  textInput: {
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
    marginHorizontal: 20,
    color: c.textPrimary,
    fontSize: 14,
    minHeight: 80,
  },
  fieldGroup: {
    marginHorizontal: 20,
    gap: 10,
  },
  fieldInput: {
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    color: c.textPrimary,
    fontSize: 15,
  },
  fieldInputError: {
    borderColor: c.danger,
  },
  fieldError: {
    marginHorizontal: 20,
    marginTop: -8,
    fontSize: 12,
    fontWeight: '600',
    color: c.danger,
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
    color: c.textMuted,
    lineHeight: 17,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: c.bgBase,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
}));

export default function ConfirmScreen() {
  const { restaurantId, date, time, partySize, shiftId, slotDateTime } = useLocalSearchParams<{
    restaurantId: string;
    date: string;
    time: string;
    partySize: string;
    shiftId: string;
    slotDateTime: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();

  const rid = restaurantId ?? '';

  const [dateKey, setDateKey] = useState<DateKey>(() =>
    coerceBookableDateKey(rid, parseBookingDateParam(date)),
  );

  useEffect(() => {
    if (!rid) return;
    setDateKey((prev) => coerceBookableDateKey(rid, prev));
  }, [rid]);
  const [guests, setGuests] = useState(parseInt(partySize ?? '2', 10));
  const [guestInput, setGuestInput] = useState(String(parseInt(partySize ?? '2', 10)));
  const [guestError, setGuestError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [occasion, setOccasion] = useState('');
  const [seatingPreference, setSeatingPreference] = useState('');
  const [notes, setNotes] = useState('');
  const [contactError, setContactError] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [restaurantVersion, setRestaurantVersion] = useState(0);
  const [restaurant, setRestaurant] = useState(() => getCachedRestaurantById(rid));
  const [restaurantReady, setRestaurantReady] = useState(() => Boolean(getCachedRestaurantById(rid)) || !rid);

  useEffect(() => {
    if (!rid) return;
    let cancelled = false;
    const cached = getCachedRestaurantById(rid);
    setRestaurant(cached);
    setRestaurantReady(Boolean(cached));
    loadRestaurantForBooking(rid).then((loaded) => {
      if (cancelled) return;
      setRestaurant(loaded ?? getCachedRestaurantById(rid));
      setRestaurantReady(true);
      setRestaurantVersion((version) => version + 1);
      setDateKey((prev) => coerceBookableDateKey(rid, prev));
    });
    return () => {
      cancelled = true;
    };
  }, [rid]);

  useEffect(() => {
    let cancelled = false;
    fetchBookingProfile().then((profile) => {
      if (cancelled || !profile) return;
      setName((current) => current || profile.full_name || '');
      setEmail((current) => current || profile.email || '');
      setPhone((current) => current || profile.phone || '');
      setSeatingPreference((current) => current || profile.seating_preference || '');
      const allergyText = [
        ...(profile.allergies ?? []),
        ...(profile.dietary_restrictions ?? []),
      ].filter(Boolean).join(', ');
      setNotes((current) => current || allergyText);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dateLabel = useMemo(() => {
    try {
      return parseDateKeyLocal(dateKey).toLocaleDateString(undefined, {
        weekday: 'long', month: 'long', day: 'numeric',
      });
    } catch { return dateKey; }
  }, [dateKey]);

  const handleConfirm = useCallback(() => {
    if (!restaurantReady || guestError || !guestInput) return;
    if (!slotDateTime || !shiftId) {
      Alert.alert(
        'Select a time',
        'Please choose an available time before continuing.',
      );
      return;
    }
    if (!name.trim()) {
      setContactError('Enter the guest name.');
      return;
    }
    if (!isValidEmail(email)) {
      setContactError('Enter a valid email address.');
      return;
    }
    setContactError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(
      `/booking/${restaurantId}/step4-preorder?date=${encodeURIComponent(dateKey)}&time=${encodeURIComponent(time ?? '')}&partySize=${guests}&shiftId=${encodeURIComponent(shiftId)}&slotDateTime=${encodeURIComponent(slotDateTime)}&name=${encodeURIComponent(name.trim())}&email=${encodeURIComponent(email.trim())}&phone=${encodeURIComponent(phone.trim())}&occasion=${encodeURIComponent(occasion)}&seatingPreference=${encodeURIComponent(seatingPreference)}&notes=${encodeURIComponent(notes)}`,
    );
  }, [restaurantReady, guestError, guestInput, slotDateTime, shiftId, name, email, router, restaurantId, dateKey, time, guests, phone, occasion, seatingPreference, notes]);

  const updateGuestsFromInput = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '');
    setGuestInput(digits);
    if (!digits) {
      setGuestError('');
      return;
    }
    const parsed = parseInt(digits, 10);
    if (parsed > 25) {
      setGuestError('25 is the maximum');
      return;
    }
    const nextGuests = Math.max(1, parsed);
    setGuestError('');
    setGuests(nextGuests);
  }, []);

  const normalizeGuestInput = useCallback(() => {
    if (guestError) return;
    const normalized = Math.max(1, Math.min(25, guests));
    setGuests(normalized);
    setGuestInput(String(normalized));
  }, [guests, guestError]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
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
              <Ionicons name="calendar-outline" size={18} color={c.gold} />
            </View>
            <View style={styles.detailBody}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{dateLabel}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
          </Pressable>

          <View style={styles.rowDivider} />

          {/* Time */}
          <Pressable style={styles.detailRow} onPress={() => router.back()}>
            <View style={styles.detailIcon}>
              <Ionicons name="time-outline" size={18} color={c.gold} />
            </View>
            <View style={styles.detailBody}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>{time}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
          </Pressable>

          <View style={styles.rowDivider} />

          {/* Guests */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="people-outline" size={18} color={c.gold} />
            </View>
            <View style={styles.detailBody}>
              <Text style={styles.detailLabel}>Guests</Text>
              <Text style={styles.detailValue}>{guests} {guests === 1 ? 'guest' : 'guests'}</Text>
            </View>
            <TextInput
              value={guestInput}
              onChangeText={updateGuestsFromInput}
              onBlur={normalizeGuestInput}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={2}
              selectTextOnFocus
              style={[styles.guestInput, guestError ? styles.guestInputError : null]}
              accessibilityLabel="Number of guests"
            />
          </View>
        </View>
        {guestError ? <Text style={styles.guestErrorText}>{guestError}</Text> : null}

        {/* Occasion */}
        <Text style={styles.sectionLabel}>Guest details</Text>
        <View style={styles.fieldGroup}>
          <TextInput
            style={[styles.fieldInput, contactError && !name.trim() ? styles.fieldInputError : null]}
            placeholder="Full name"
            placeholderTextColor={c.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            textContentType="name"
          />
          <TextInput
            style={[styles.fieldInput, contactError && !isValidEmail(email) ? styles.fieldInputError : null]}
            placeholder="Email"
            placeholderTextColor={c.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextInput
            style={styles.fieldInput}
            placeholder="Phone (optional)"
            placeholderTextColor={c.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
          />
        </View>
        {contactError ? <Text style={styles.fieldError}>{contactError}</Text> : null}

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

        <Text style={styles.sectionLabel}>
          Seating preference <Text style={styles.optional}>(optional)</Text>
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {SEATING_OPTIONS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setSeatingPreference(seatingPreference === option ? '' : option)}
              style={[styles.chip, seatingPreference === option && styles.chipSelected]}
            >
              <Text style={[styles.chipText, seatingPreference === option && styles.chipTextSelected]}>{option}</Text>
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
          placeholderTextColor={c.textMuted}
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
          textAlignVertical="top"
        />

        {/* Policy */}
        <View style={styles.policyRow}>
          <Ionicons name="shield-checkmark-outline" size={15} color={c.textMuted} />
          <Text style={styles.policyText}>Free cancellation up to 24 hours before your reservation.</Text>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button title="Continue to menu" onPress={handleConfirm} disabled={!restaurantReady || !!guestError || !guestInput} />
      </View>

      <BookingCalendarModal
        visible={calendarOpen}
        restaurantId={restaurantId ?? ''}
        selectedDateKey={dateKey}
        availabilityVersion={restaurantVersion}
        onClose={() => setCalendarOpen(false)}
        onSelect={(k) => {
          setCalendarOpen(false);
          router.replace(`/booking/${restaurantId}/step2-time?date=${encodeURIComponent(k)}`);
        }}
      />
    </View>
  );
}
