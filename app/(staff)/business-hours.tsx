import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { RestaurantPicker } from '@/components/owner/RestaurantPicker';
import { useOwnerScope } from '@/hooks/useOwnerScope';
import {
  BUSINESS_HOURS_DAY_KEYS,
  DEFAULT_BUSINESS_HOURS,
  readBusinessHours,
  writeBusinessHours,
  type BusinessHoursDayKey,
  type BusinessHoursSchedule,
} from '@/lib/owner/businessHoursSettings';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import { friendlyError } from '@/lib/errors/friendlyError';

type DayRow = {
  key: BusinessHoursDayKey;
  day: string;
  short: string;
  open: boolean;
  start: string; // "11:30 AM"
  end: string; // "10:00 PM"
};

const DAY_LABELS: Record<BusinessHoursDayKey, { day: string; short: string }> = {
  mon: { day: 'Monday', short: 'Mon' },
  tue: { day: 'Tuesday', short: 'Tue' },
  wed: { day: 'Wednesday', short: 'Wed' },
  thu: { day: 'Thursday', short: 'Thu' },
  fri: { day: 'Friday', short: 'Fri' },
  sat: { day: 'Saturday', short: 'Sat' },
  sun: { day: 'Sunday', short: 'Sun' },
};

function scheduleToRows(schedule: BusinessHoursSchedule): DayRow[] {
  return BUSINESS_HOURS_DAY_KEYS.map((key) => ({
    key,
    day: DAY_LABELS[key].day,
    short: DAY_LABELS[key].short,
    open: schedule[key].open,
    start: schedule[key].start,
    end: schedule[key].end,
  }));
}

function rowsToSchedule(rows: DayRow[]): BusinessHoursSchedule {
  const out = {} as BusinessHoursSchedule;
  for (const row of rows) {
    out[row.key] = { open: row.open, start: row.start, end: row.end };
  }
  return out;
}

const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 7; h <= 23; h++) {
    for (const m of [0, 30]) {
      const period = h < 12 ? 'AM' : 'PM';
      const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const mm = m === 0 ? '00' : '30';
      out.push(`${hh}:${mm} ${period}`);
    }
  }
  out.push('12:00 AM');
  return out;
})();

const useStyles = createStyles((c) => ({
  intro: {
    paddingHorizontal: 4,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  introTitle: { ...typography.h2, color: c.textPrimary },
  introText: { ...typography.body, color: c.textMuted, lineHeight: 22 },

  pickerRow: {
    marginBottom: spacing.md,
  },

  card: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 60,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  dayName: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
    width: 86,
  },
  hoursWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  timeBtnPressed: { opacity: 0.7 },
  timeBtnText: {
    ...typography.bodySmall,
    color: c.textPrimary,
    fontWeight: '600',
  },
  timeBtnDisabled: { opacity: 0.4 },
  toBetween: {
    ...typography.bodySmall,
    color: c.textMuted,
    fontWeight: '600',
  },
  closedLabel: {
    ...typography.bodySmall,
    color: c.textMuted,
    flex: 1,
    fontStyle: 'italic',
  },
  switch: { transform: [{ scale: 0.9 }] },

  copyAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
  },
  copyAllText: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '700',
  },

  saveBtn: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: c.gold,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  saveBtnPressed: { opacity: 0.85 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    ...typography.body,
    color: '#1A1A1A',
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  emptyWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    ...typography.bodySmall,
    color: c.textMuted,
    textAlign: 'center',
  },

  loadingWrap: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
  },

  /* Time picker modal */
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: c.bgSurface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    maxHeight: '70%',
  },
  pickerGrabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    marginBottom: spacing.md,
  },
  pickerTitle: {
    ...typography.h3,
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  pickerOptionActive: {
    backgroundColor: c.bgElevated,
  },
  pickerOptionText: {
    ...typography.body,
    color: c.textPrimary,
    textAlign: 'center',
  },
  pickerOptionTextActive: {
    color: c.gold,
    fontWeight: '700',
  },
}));

type PickerTarget = { dayIndex: number; field: 'start' | 'end' } | null;

export default function BusinessHoursScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const { selectedRestaurantId, isAll, isLoading: scopeLoading } = useOwnerScope();

  const [hours, setHours] = useState<DayRow[]>(() => scheduleToRows(DEFAULT_BUSINESS_HOURS));
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load persisted schedule whenever the selected restaurant changes.
  useEffect(() => {
    if (isAll || !selectedRestaurantId) {
      return;
    }
    let active = true;
    setLoading(true);
    readBusinessHours(selectedRestaurantId)
      .then((stored) => {
        if (!active) return;
        setHours(scheduleToRows(stored ?? DEFAULT_BUSINESS_HOURS));
      })
      .catch((err) => {
        if (!active) return;
        console.warn('[business-hours] readBusinessHours failed', err);
        setHours(scheduleToRows(DEFAULT_BUSINESS_HOURS));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedRestaurantId, isAll]);

  const updateDay = (i: number, patch: Partial<DayRow>) => {
    setHours((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  };

  const copyMondayToAll = () => {
    const mon = hours[0];
    if (!mon) return;
    setHours(hours.map((d) => ({ ...d, open: mon.open, start: mon.start, end: mon.end })));
  };

  const pickerValue =
    picker && hours[picker.dayIndex] ? hours[picker.dayIndex][picker.field] : null;

  const handleSave = useCallback(async () => {
    if (!selectedRestaurantId || saving) return;
    setSaving(true);
    try {
      await writeBusinessHours(selectedRestaurantId, rowsToSchedule(hours));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Saved', 'Business hours updated.');
    } catch (err) {
      console.warn('[business-hours] writeBusinessHours failed', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert("Couldn't save", friendlyError(err, 'Please try again in a moment.'));
    } finally {
      setSaving(false);
    }
  }, [hours, saving, selectedRestaurantId]);

  const canSave = !!selectedRestaurantId && !isAll && !loading && !saving;

  const allMode = useMemo(() => isAll, [isAll]);

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title="Business hours"
          accentBack
        />
      }
    >
      <View style={styles.intro}>
        <Text style={styles.introTitle}>When are you open?</Text>
        <Text style={styles.introText}>
          Set the hours guests can book or walk in for each day of the week.
        </Text>
      </View>

      <View style={styles.pickerRow}>
        <RestaurantPicker allowAll={false} size="compact" />
      </View>

      {allMode ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="storefront-outline" size={28} color={c.gold} />
          <Text style={styles.emptyTitle}>Pick a restaurant to manage business hours</Text>
          <Text style={styles.emptyText}>
            Hours are stored per location. Use the picker above to choose one.
          </Text>
        </View>
      ) : scopeLoading || loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={c.gold} />
        </View>
      ) : !selectedRestaurantId ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No restaurant selected</Text>
          <Text style={styles.emptyText}>
            Once you have a restaurant set up, its business hours will appear here.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            {hours.map((d, i) => (
              <View key={d.key} style={[styles.dayRow, i > 0 && styles.rowDivider]}>
                <Text style={styles.dayName}>{d.day}</Text>
                {d.open ? (
                  <View style={styles.hoursWrap}>
                    <Pressable
                      onPress={() => setPicker({ dayIndex: i, field: 'start' })}
                      style={({ pressed }) => [styles.timeBtn, pressed && styles.timeBtnPressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`${d.day} opens at ${d.start}`}
                    >
                      <Text style={styles.timeBtnText}>{d.start}</Text>
                    </Pressable>
                    <Text style={styles.toBetween}>–</Text>
                    <Pressable
                      onPress={() => setPicker({ dayIndex: i, field: 'end' })}
                      style={({ pressed }) => [styles.timeBtn, pressed && styles.timeBtnPressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`${d.day} closes at ${d.end}`}
                    >
                      <Text style={styles.timeBtnText}>{d.end}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.closedLabel}>Closed</Text>
                )}
                <Switch
                  value={d.open}
                  onValueChange={(v) => updateDay(i, { open: v })}
                  trackColor={{ true: c.gold, false: c.border }}
                  thumbColor="#fff"
                  style={styles.switch}
                />
              </View>
            ))}
          </View>

          <Pressable
            onPress={copyMondayToAll}
            style={({ pressed }) => [styles.copyAllRow, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
          >
            <Ionicons name="copy-outline" size={14} color={c.gold} />
            <Text style={styles.copyAllText}>Apply Monday's hours to every day</Text>
          </Pressable>

          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && styles.saveBtnPressed,
              !canSave && styles.saveBtnDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Save business hours"
          >
            {saving ? (
              <ActivityIndicator color="#1A1A1A" size="small" />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={18} color="#1A1A1A" />
            )}
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save changes'}</Text>
          </Pressable>
        </>
      )}

      {/* Time picker sheet */}
      <Modal
        visible={picker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPicker(null)}
      >
        <Pressable style={styles.pickerOverlay} onPress={() => setPicker(null)}>
          <Pressable style={styles.pickerSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.pickerGrabber} />
            <Text style={styles.pickerTitle}>
              {picker?.field === 'start' ? 'Opens at' : 'Closes at'}
            </Text>
            <ScrollView>
              {TIME_OPTIONS.map((t) => {
                const active = t === pickerValue;
                return (
                  <Pressable
                    key={t}
                    onPress={() => {
                      if (picker) updateDay(picker.dayIndex, { [picker.field]: t });
                      setPicker(null);
                    }}
                    style={[styles.pickerOption, active && styles.pickerOptionActive]}
                  >
                    <Text
                      style={[styles.pickerOptionText, active && styles.pickerOptionTextActive]}
                    >
                      {t}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </OwnerScreen>
  );
}
