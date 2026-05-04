import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui';
import { BookingCalendarModal } from '@/components/booking/BookingCalendarModal';
import { parseBookingDateParam, parseDateKeyLocal } from '@/lib/booking/dateUtils';
import {
  firstBookableDateKey,
  getTimeSlotsForDate,
  nextBookableDateAfter,
} from '@/lib/booking/getAvailability';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import type { DateKey } from '@/lib/booking/availabilityTypes';

const SLOT_COLS = 3;
const SLOT_GAP = 10;

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

  const firstDate = useMemo(() => firstBookableDateKey(rid), [rid]);

  const [dateKey, setDateKey] = useState<DateKey>(
    () => parseBookingDateParam(date) ?? firstDate,
  );
  const [partySize, setPartySize] = useState(2);
  const [partySizeInput, setPartySizeInput] = useState('2');
  const [partySizeError, setPartySizeError] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const pillLabel = useMemo(() => {
    const d = parseDateKeyLocal(dateKey);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }, [dateKey]);

  const slots = useMemo(
    () => getTimeSlotsForDate(rid, dateKey, partySize),
    [rid, dateKey, partySize],
  );

  useEffect(() => {
    const first = slots.find((s) => s.available);
    if (first) {
      setSelectedSlotId(first.slotId);
      setSelectedLabel(first.label);
    } else {
      setSelectedSlotId(null);
      setSelectedLabel(null);
    }
  }, [slots]);

  const restaurant = mockRestaurants.find((r) => r.id === restaurantId);

  const updatePartySize = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '');
    setPartySizeInput(digits);
    if (!digits) {
      setPartySizeError('');
      return;
    }
    const parsed = parseInt(digits, 10);
    if (parsed > 20) {
      setPartySizeError('20 is the maximum');
      return;
    }
    const nextSize = Math.max(1, parsed);
    setPartySizeError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPartySize(nextSize);
  }, []);

  const normalizePartySize = useCallback(() => {
    if (partySizeError) return;
    const normalized = Math.max(1, Math.min(20, partySize));
    setPartySize(normalized);
    setPartySizeInput(String(normalized));
  }, [partySize, partySizeError]);

  const handleSelectSlot = useCallback((slotId: string, label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSlotId(slotId);
    setSelectedLabel(label);
  }, []);

  const handleNext = useCallback(() => {
    if (!selectedLabel || partySizeError || !partySizeInput) return;
    router.push(
      `/booking/${restaurantId}/confirm?date=${encodeURIComponent(dateKey)}&time=${encodeURIComponent(selectedLabel)}&partySize=${partySize}`,
    );
  }, [selectedLabel, partySizeError, partySizeInput, restaurantId, dateKey, partySize, router]);

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
        {slots.some((s) => s.available) ? (
          <View style={styles.slotsGrid}>
            {slots.map((slot) => (
              <Pressable
                key={slot.slotId}
                onPress={() => slot.available && handleSelectSlot(slot.slotId, slot.label)}
                disabled={!slot.available}
                style={[
                  styles.slotPill,
                  slot.available && selectedSlotId === slot.slotId && styles.slotPillSelected,
                  !slot.available && styles.slotPillUnavailable,
                ]}
              >
                <Text style={[
                  styles.slotText,
                  slot.available && selectedSlotId === slot.slotId && styles.slotTextSelected,
                  !slot.available && styles.slotTextUnavailable,
                ]}>
                  {slot.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.noTimesBox}>
            <Text style={styles.noTimesText}>No availability on this date</Text>
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
          disabled={!selectedLabel || !!partySizeError || !partySizeInput}
        />
      </View>

      <BookingCalendarModal
        visible={calendarOpen}
        restaurantId={rid}
        selectedDateKey={dateKey}
        onClose={() => setCalendarOpen(false)}
        onSelect={(k) => { setDateKey(k); setCalendarOpen(false); }}
      />
    </View>
  );
}
