import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui';
import { BookingCalendarModal } from '@/components/booking/BookingCalendarModal';
import { parseBookingDateParam, parseDateKeyLocal } from '@/lib/booking/dateUtils';
import { isClosedBookingDate } from '@/lib/booking/hoursSchedule';
import {
  coerceBookableDateKey,
  getShiftConfig,
  nextBookableDateAfter,
} from '@/lib/booking/getAvailability';
import {
  getAvailability as getPublicAvailability,
  type AvailabilitySlot,
} from '@/lib/booking/publicBookingApi';
import {
  getCachedRestaurantById,
  loadRestaurantForBooking,
} from '@/lib/data/restaurantCatalog';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import type { DateKey } from '@/lib/booking/availabilityTypes';

const SLOT_COLS = 3;
const SLOT_GAP = 10;

function availabilitySlotKey(slot: AvailabilitySlot) {
  return `${slot.shift_id}|${slot.date_time}`;
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
  headerCenter: { flex: 1, alignItems: 'center' },
  restaurantName: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
  },

  scroll: { flex: 1 },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: -4,
  },

  // Party size input
  partyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    gap: 12,
  },
  partyInputLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: c.textPrimary,
  },
  partyInputHelper: {
    fontSize: 12,
    fontWeight: '500',
    color: c.textSecondary,
    marginTop: 2,
  },
  partyInput: {
    minWidth: 62,
    height: 42,
    borderRadius: 21,
    backgroundColor: c.bgElevated,
    borderWidth: 1,
    borderColor: c.border,
    color: c.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  partyInputError: {
    borderColor: c.danger,
  },
  guestErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.danger,
    marginTop: -6,
  },

  // Date row
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    gap: 10,
  },
  dateRowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
  datePill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: 1,
    borderColor: c.border,
  },
  datePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textSecondary,
  },

  // Time slots grid
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SLOT_GAP,
  },
  slotPill: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    alignItems: 'center',
    minWidth: 90,
    flex: 1,
  },
  slotPillSelected: {
    backgroundColor: c.gold,
    borderColor: c.gold,
  },
  slotPillUnavailable: {
    opacity: 0.3,
  },
  slotText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },
  slotTextSelected: {
    color: c.bgBase,
    fontWeight: '700',
  },
  slotTextUnavailable: {
    color: c.textMuted,
  },

  // No times
  noTimesBox: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  noTimesText: {
    fontSize: 14,
    color: c.textMuted,
  },
  noTimesLink: {
    fontSize: 14,
    fontWeight: '600',
    color: c.gold,
  },
  slotError: {
    fontSize: 13,
    fontWeight: '600',
    color: c.danger,
    textAlign: 'center',
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: c.bgBase,
    borderTopWidth: 1,
    borderTopColor: c.border,
    gap: 8,
  },
  selectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  selectionText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.gold,
  },
}));

export default function Step2Time() {
  const { restaurantId, date } = useLocalSearchParams<{ restaurantId: string; date: string }>();
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
  const [partySize, setPartySize] = useState(2);
  const [partySizeInput, setPartySizeInput] = useState('2');
  const [partySizeError, setPartySizeError] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [restaurantVersion, setRestaurantVersion] = useState(0);
  const [restaurant, setRestaurant] = useState(() => getCachedRestaurantById(rid));
  const [restaurantReady, setRestaurantReady] = useState(() => Boolean(getCachedRestaurantById(rid)) || !rid);

  const pillLabel = useMemo(() => {
    const d = parseDateKeyLocal(dateKey);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }, [dateKey]);

  const selectedSlot = useMemo(
    () => slots.find((slot) => availabilitySlotKey(slot) === selectedSlotId) ?? null,
    [selectedSlotId, slots],
  );
  const selectedLabel = selectedSlot?.display_time ?? null;

  const isClosedDay = useMemo(() => {
    const d = parseDateKeyLocal(dateKey);
    if (restaurant?.hoursJson && isClosedBookingDate(restaurant.hoursJson, dateKey, d.getDay())) {
      return true;
    }
    const config = getShiftConfig(rid);
    return config.closedWeekdays.includes(d.getDay());
  }, [rid, dateKey, restaurant, restaurantVersion]);

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
    if (!rid || partySizeError || !partySizeInput) {
      setSlots([]);
      setSelectedSlotId(null);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(null);
    setSelectedSlotId(null);
    getPublicAvailability({ restaurantId: rid, date: dateKey, partySize })
      .then((result) => {
        if (cancelled) return;
        setSlots(result.slots);
        setSelectedSlotId(result.slots[0] ? availabilitySlotKey(result.slots[0]) : null);
      })
      .catch((error) => {
        if (cancelled) return;
        setSlots([]);
        setSlotsError(error instanceof Error ? error.message : 'Could not load availability.');
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateKey, partySize, partySizeError, partySizeInput, rid, restaurantVersion]);

  const updatePartySize = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '');
    setPartySizeInput(digits);
    if (!digits) {
      setPartySizeError('');
      return;
    }
    const parsed = parseInt(digits, 10);
    if (parsed > 25) {
      setPartySizeError('25 is the maximum');
      return;
    }
    const nextSize = Math.max(1, parsed);
    setPartySizeError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPartySize(nextSize);
  }, []);

  const normalizePartySize = useCallback(() => {
    if (partySizeError) return;
    const normalized = Math.max(1, Math.min(25, partySize));
    setPartySize(normalized);
    setPartySizeInput(String(normalized));
  }, [partySize, partySizeError]);

  const handleSelectSlot = useCallback((slot: AvailabilitySlot) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSlotId(availabilitySlotKey(slot));
  }, []);

  const handleNext = useCallback(() => {
    if (!selectedSlot || partySizeError || !partySizeInput) return;
    router.push(
      `/booking/${restaurantId}/confirm?date=${encodeURIComponent(dateKey)}&time=${encodeURIComponent(selectedSlot.display_time)}&partySize=${partySize}&shiftId=${encodeURIComponent(selectedSlot.shift_id)}&slotDateTime=${encodeURIComponent(selectedSlot.date_time)}`,
    );
  }, [selectedSlot, partySizeError, partySizeInput, restaurantId, dateKey, partySize, router]);

  const handleNextDate = useCallback(() => {
    setDateKey(nextBookableDateAfter(rid, dateKey));
  }, [rid, dateKey]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.restaurantName} numberOfLines={1}>{restaurant?.name}</Text>
          <Text style={styles.headerSub}>Select date, time & guests</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Party size */}
        <Text style={styles.sectionLabel}>Guests</Text>
        <View style={styles.partyInputRow}>
          <Ionicons name="people-outline" size={20} color={c.gold} />
          <View style={{ flex: 1 }}>
            <Text style={styles.partyInputLabel}>
              {partySize} {partySize === 1 ? 'guest' : 'guests'}
            </Text>
            <Text style={styles.partyInputHelper}>Type how many guests are coming</Text>
          </View>
          <TextInput
            value={partySizeInput}
            onChangeText={updatePartySize}
            onBlur={normalizePartySize}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={2}
            selectTextOnFocus
            style={[styles.partyInput, partySizeError ? styles.partyInputError : null]}
            accessibilityLabel="Number of guests"
          />
        </View>
        {partySizeError ? <Text style={styles.guestErrorText}>{partySizeError}</Text> : null}

        {/* Date */}
        <Text style={styles.sectionLabel}>Date</Text>
        <Pressable style={styles.dateRow} onPress={() => setCalendarOpen(true)}>
          <Ionicons name="calendar-outline" size={20} color={c.gold} />
          <Text style={styles.dateRowLabel}>{pillLabel}</Text>
          <View style={styles.datePill}>
            <Text style={styles.datePillText}>Change</Text>
          </View>
        </Pressable>

        {/* Time slots */}
        <Text style={styles.sectionLabel}>Available times</Text>
        {slotsLoading ? (
          <View style={styles.noTimesBox}>
            <ActivityIndicator color={c.gold} />
            <Text style={styles.noTimesText}>Checking live availability</Text>
          </View>
        ) : slotsError ? (
          <View style={styles.noTimesBox}>
            <Text style={styles.slotError}>{slotsError}</Text>
            <Pressable onPress={() => setRestaurantVersion((version) => version + 1)}>
              <Text style={styles.noTimesLink}>Try again</Text>
            </Pressable>
          </View>
        ) : slots.length > 0 ? (
          <View style={styles.slotsGrid}>
            {slots.map((slot) => (
              <Pressable
                key={availabilitySlotKey(slot)}
                onPress={() => handleSelectSlot(slot)}
                style={[
                  styles.slotPill,
                  selectedSlotId === availabilitySlotKey(slot) && styles.slotPillSelected,
                ]}
              >
                <Text style={[
                  styles.slotText,
                  selectedSlotId === availabilitySlotKey(slot) && styles.slotTextSelected,
                ]}>
                  {slot.display_time}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.noTimesBox}>
            <Text style={styles.noTimesText}>
              {isClosedDay ? 'Restaurant is closed on this day' : 'No availability on this date'}
            </Text>
            <Pressable onPress={handleNextDate}>
              <Text style={styles.noTimesLink}>Next available date →</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {selectedLabel ? (
          <View style={styles.selectionBadge}>
            <Ionicons name="checkmark-circle" size={15} color={c.gold} />
            <Text style={styles.selectionText}>
              {selectedLabel} · {partySize} {partySize === 1 ? 'guest' : 'guests'}
            </Text>
          </View>
        ) : null}
        <Button
          title="Continue"
          onPress={handleNext}
          disabled={!restaurantReady || slotsLoading || !selectedSlot || !!partySizeError || !partySizeInput}
        />
      </View>

      <BookingCalendarModal
        visible={calendarOpen}
        restaurantId={rid}
        selectedDateKey={dateKey}
        availabilityVersion={restaurantVersion}
        onClose={() => setCalendarOpen(false)}
        onSelect={(k) => { setDateKey(k); setCalendarOpen(false); }}
      />
    </View>
  );
}
