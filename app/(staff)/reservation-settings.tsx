import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import {
  BOOKING_WINDOW_MAX_DAYS,
  BOOKING_WINDOW_MIN_DAYS,
  BOOKING_WINDOW_STEP_DAYS,
  DEFAULT_BOOKING_WINDOW_DAYS,
  MAX_ONLINE_PARTY_SIZE,
} from '@/lib/booking/bookingLimits';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

const useStyles = createStyles((c) => ({
  intro: {
    paddingHorizontal: 4,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  introTitle: { ...typography.h2, color: c.textPrimary },
  introText: { ...typography.body, color: c.textMuted, lineHeight: 22 },

  sectionLabel: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1.2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 60,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  rowLabel: { flex: 1, gap: 2 },
  rowTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  rowDesc: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 16,
  },

  /* Stepper control */
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    backgroundColor: c.bgElevated,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnPressed: { backgroundColor: c.bgSurface },
  stepperBtnDisabled: { opacity: 0.35 },
  stepperValue: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'center',
  },

  /* Slot duration chips */
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  chipActive: {
    backgroundColor: 'rgba(201,168,76,0.16)',
    borderColor: c.gold,
  },
  chipText: {
    ...typography.bodySmall,
    color: c.textPrimary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: c.gold,
  },

  stackedRowText: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.sm,
  },
  rowDescOnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    paddingTop: spacing.xs,
  },
}));

const SLOT_OPTIONS = [15, 30, 45, 60, 90, 120, 150, 180];
const NOTICE_OPTIONS = ['No notice', '30 min', '1 hour', '2 hours', '24 hours'];

type StepperProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
};

function Stepper({ value, min, max, step = 1, unit, onChange }: StepperProps) {
  const c = useColors();
  const styles = useStyles();
  const canDec = value > min;
  const canInc = value < max;
  const updateValue = (nextValue: number) => onChange(Math.min(max, Math.max(min, nextValue)));

  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => canDec && updateValue(value - step)}
        style={({ pressed }) => [
          styles.stepperBtn,
          pressed && styles.stepperBtnPressed,
          !canDec && styles.stepperBtnDisabled,
        ]}
        disabled={!canDec}
        hitSlop={6}
        accessibilityLabel="Decrease"
      >
        <Ionicons name="remove" size={18} color={c.textPrimary} />
      </Pressable>
      <Text style={styles.stepperValue}>
        {value}
        {unit ? ` ${unit}` : ''}
      </Text>
      <Pressable
        onPress={() => canInc && updateValue(value + step)}
        style={({ pressed }) => [
          styles.stepperBtn,
          pressed && styles.stepperBtnPressed,
          !canInc && styles.stepperBtnDisabled,
        ]}
        disabled={!canInc}
        hitSlop={6}
        accessibilityLabel="Increase"
      >
        <Ionicons name="add" size={18} color={c.textPrimary} />
      </Pressable>
    </View>
  );
}

export default function ReservationSettingsScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();

  const [acceptingBookings, setAcceptingBookings] = useState(true);
  const [maxParty, setMaxParty] = useState(10);
  const [advanceDays, setAdvanceDays] = useState(DEFAULT_BOOKING_WINDOW_DAYS);
  const [slotMinutes, setSlotMinutes] = useState<number>(30);
  const [minNotice, setMinNotice] = useState<string>('1 hour');

  const [largePartyDeposit, setLargePartyDeposit] = useState(true);
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [allowSpecialRequests, setAllowSpecialRequests] = useState(true);

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title="Reservation settings"
          accentBack
        />
      }
    >
      <View style={styles.intro}>
        <Text style={styles.introTitle}>How guests can book</Text>
        <Text style={styles.introText}>Decide how reservations work for your restaurant.</Text>
      </View>

      <Text style={styles.sectionLabel}>BOOKINGS</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark-done-outline" size={18} color={c.gold} />
          </View>
          <View style={styles.rowLabel}>
            <Text style={styles.rowTitle}>Accepting reservations</Text>
            <Text style={styles.rowDesc}>Turn off to pause new bookings.</Text>
          </View>
          <Switch
            value={acceptingBookings}
            onValueChange={setAcceptingBookings}
            trackColor={{ true: c.gold, false: c.border }}
            thumbColor="#fff"
          />
        </View>
        <View style={[styles.row, styles.rowDivider]}>
          <View style={styles.iconWrap}>
            <Ionicons name="flash-outline" size={18} color={c.gold} />
          </View>
          <View style={styles.rowLabel}>
            <Text style={styles.rowTitle}>Auto-confirm bookings</Text>
            <Text style={styles.rowDesc}>Skip manual review and confirm requests automatically.</Text>
          </View>
          <Switch
            value={autoConfirm}
            onValueChange={setAutoConfirm}
            trackColor={{ true: c.gold, false: c.border }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <Text style={styles.sectionLabel}>PARTY & SCHEDULE</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name="people-outline" size={18} color={c.gold} />
          </View>
          <View style={styles.stackedRowText}>
            <Text style={styles.rowTitle}>Maximum party size</Text>
            <Text style={styles.rowDesc}>Largest group that can book online.</Text>
          </View>
          <Stepper value={maxParty} min={1} max={MAX_ONLINE_PARTY_SIZE} onChange={setMaxParty} />
        </View>
        <View style={[styles.row, styles.rowDivider]}>
          <View style={styles.iconWrap}>
            <Ionicons name="calendar-outline" size={18} color={c.gold} />
          </View>
          <View style={styles.stackedRowText}>
            <Text style={styles.rowTitle}>Booking window</Text>
            <Text style={styles.rowDesc}>How far in advance guests can book.</Text>
          </View>
          <Stepper
            value={advanceDays}
            min={BOOKING_WINDOW_MIN_DAYS}
            max={BOOKING_WINDOW_MAX_DAYS}
            step={BOOKING_WINDOW_STEP_DAYS}
            unit="d"
            onChange={setAdvanceDays}
          />
        </View>

        <View style={[styles.row, styles.rowDivider, { flexDirection: 'column', alignItems: 'flex-start', gap: spacing.sm }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, alignSelf: 'stretch' }}>
            <View style={styles.iconWrap}>
              <Ionicons name="time-outline" size={18} color={c.gold} />
            </View>
            <View style={styles.rowLabel}>
              <Text style={styles.rowTitle}>Time slot length</Text>
              <Text style={styles.rowDesc}>How long each reservation slot is.</Text>
            </View>
          </View>
          <View style={styles.chipRow}>
            {SLOT_OPTIONS.map((m) => {
              const active = slotMinutes === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => setSlotMinutes(m)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{m} min</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.row, styles.rowDivider, { flexDirection: 'column', alignItems: 'flex-start', gap: spacing.sm }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, alignSelf: 'stretch' }}>
            <View style={styles.iconWrap}>
              <Ionicons name="hourglass-outline" size={18} color={c.gold} />
            </View>
            <View style={styles.rowLabel}>
              <Text style={styles.rowTitle}>Minimum lead time</Text>
              <Text style={styles.rowDesc}>How close to a slot a guest can still book.</Text>
            </View>
          </View>
          <View style={styles.chipRow}>
            {NOTICE_OPTIONS.map((n) => {
              const active = minNotice === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => setMinNotice(n)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{n}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <Text style={styles.sectionLabel}>POLICIES</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name="people-circle-outline" size={18} color={c.gold} />
          </View>
          <View style={styles.rowLabel}>
            <Text style={styles.rowTitle}>Deposit for parties of 8+</Text>
            <Text style={styles.rowDesc}>Hold a card only for larger groups.</Text>
          </View>
          <Switch
            value={largePartyDeposit}
            onValueChange={setLargePartyDeposit}
            trackColor={{ true: c.gold, false: c.border }}
            thumbColor="#fff"
          />
        </View>
        <View style={[styles.row, styles.rowDivider]}>
          <View style={styles.iconWrap}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={c.gold} />
          </View>
          <View style={styles.rowLabel}>
            <Text style={styles.rowTitle}>Allow special requests</Text>
            <Text style={styles.rowDesc}>Let guests add notes (allergies, occasion, etc.).</Text>
          </View>
          <Switch
            value={allowSpecialRequests}
            onValueChange={setAllowSpecialRequests}
            trackColor={{ true: c.gold, false: c.border }}
            thumbColor="#fff"
          />
        </View>
      </View>
    </OwnerScreen>
  );
}
