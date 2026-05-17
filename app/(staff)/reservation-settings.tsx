import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { RestaurantPicker } from '@/components/owner/RestaurantPicker';
import { useOwnerScope } from '@/hooks/useOwnerScope';
import {
  BOOKING_WINDOW_MAX_DAYS,
  BOOKING_WINDOW_MIN_DAYS,
  BOOKING_WINDOW_STEP_DAYS,
  MAX_ONLINE_PARTY_SIZE,
} from '@/lib/booking/bookingLimits';
import { SLOT_DURATION_OPTIONS, NOTICE_OPTIONS } from '@/lib/booking/bookingDefaults';
import {
  DEFAULT_RESERVATION_SETTINGS,
  readReservationSettings,
  writeReservationSettings,
  type ReservationSettings,
} from '@/lib/owner/reservationSettings';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import { friendlyError } from '@/lib/errors/friendlyError';

const useStyles = createStyles((c) => ({
  pickerRow: {
    paddingHorizontal: 4,
    marginBottom: spacing.md,
  },
  intro: {
    paddingHorizontal: 4,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  introTitle: { ...typography.h2, color: c.textPrimary },
  introText: { ...typography.body, color: c.textMuted, lineHeight: 22 },

  emptyState: {
    paddingHorizontal: 4,
    paddingTop: spacing.xl,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  emptyTitle: { ...typography.h2, color: c.textPrimary },
  emptyText: { ...typography.body, color: c.textMuted, lineHeight: 22 },

  loadingWrap: {
    paddingTop: spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },

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

  saveBtn: {
    marginTop: spacing.lg,
    marginHorizontal: 4,
    backgroundColor: c.gold,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  saveBtnPressed: { opacity: 0.85 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    ...typography.body,
    color: '#000',
    fontWeight: '800',
    letterSpacing: 0.2,
  },
}));

const SLOT_OPTIONS = SLOT_DURATION_OPTIONS;

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
  const { t } = useTranslation();
  const { isAll, selectedRestaurantId, hasMultiple } = useOwnerScope();

  const [acceptingBookings, setAcceptingBookings] = useState(true);
  const [largePartyDeposit, setLargePartyDeposit] = useState(true);
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [allowSpecialRequests, setAllowSpecialRequests] = useState(true);

  const [settings, setSettings] = useState<ReservationSettings>(DEFAULT_RESERVATION_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isAll || !selectedRestaurantId) {
      setSettings(DEFAULT_RESERVATION_SETTINGS);
      return;
    }
    let active = true;
    setIsLoading(true);
    void (async () => {
      try {
        const loaded = await readReservationSettings(selectedRestaurantId);
        if (active) setSettings(loaded);
      } catch (err) {
        if (active) setSettings(DEFAULT_RESERVATION_SETTINGS);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isAll, selectedRestaurantId]);

  const updateSetting = <K extends keyof ReservationSettings>(
    key: K,
    value: ReservationSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!selectedRestaurantId || isAll) return;
    setIsSaving(true);
    try {
      await writeReservationSettings(selectedRestaurantId, settings);
      Alert.alert('Saved', 'Reservation settings updated.');
    } catch (err) {
      Alert.alert('Save failed', friendlyError(err, 'Could not save reservation settings.'));
    } finally {
      setIsSaving(false);
    }
  };

  const renderPicker = hasMultiple ? (
    <View style={styles.pickerRow}>
      <RestaurantPicker allowAll={false} />
    </View>
  ) : null;

  if (isAll) {
    return (
      <OwnerScreen
        header={<SubpageHeader title="Reservation settings" accentBack />}
      >
        {renderPicker}
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Pick a restaurant</Text>
          <Text style={styles.emptyText}>
            Pick a restaurant to manage reservation settings.
          </Text>
        </View>
      </OwnerScreen>
    );
  }

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title="Reservation settings"
          accentBack
        />
      }
    >
      {renderPicker}
      <View style={styles.intro}>
        <Text style={styles.introTitle}>How guests can book</Text>
        <Text style={styles.introText}>Decide how reservations work for your restaurant.</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={c.gold} />
        </View>
      ) : (
        <>
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
              <Stepper
                value={settings.maxOnlinePartySize}
                min={1}
                max={MAX_ONLINE_PARTY_SIZE}
                onChange={(v) => updateSetting('maxOnlinePartySize', v)}
              />
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
                value={settings.bookingWindowDays}
                min={BOOKING_WINDOW_MIN_DAYS}
                max={BOOKING_WINDOW_MAX_DAYS}
                step={BOOKING_WINDOW_STEP_DAYS}
                unit="d"
                onChange={(v) => updateSetting('bookingWindowDays', v)}
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
                  const active = settings.slotDurationMinutes === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => updateSetting('slotDurationMinutes', m)}
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
                {NOTICE_OPTIONS.map((option) => {
                  const active = settings.cancellationNoticeMinutes === option.minutes;
                  return (
                    <Pressable
                      key={option.labelKey}
                      onPress={() => updateSetting('cancellationNoticeMinutes', option.minutes)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {t(option.labelKey)}
                      </Text>
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

          <Pressable
            onPress={handleSave}
            disabled={isSaving || !selectedRestaurantId}
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && styles.saveBtnPressed,
              (isSaving || !selectedRestaurantId) && styles.saveBtnDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Save reservation settings"
          >
            {isSaving ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.saveBtnText}>Save changes</Text>
            )}
          </Pressable>
        </>
      )}
    </OwnerScreen>
  );
}
