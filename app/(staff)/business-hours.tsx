import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

type DayHours = {
  day: string;
  short: string;
  open: boolean;
  start: string; // "11:30 AM"
  end: string; // "10:00 PM"
};

const DEFAULT_HOURS: DayHours[] = [
  { day: 'Monday', short: 'Mon', open: true, start: '11:30 AM', end: '10:00 PM' },
  { day: 'Tuesday', short: 'Tue', open: true, start: '11:30 AM', end: '10:00 PM' },
  { day: 'Wednesday', short: 'Wed', open: true, start: '11:30 AM', end: '10:00 PM' },
  { day: 'Thursday', short: 'Thu', open: true, start: '11:30 AM', end: '10:00 PM' },
  { day: 'Friday', short: 'Fri', open: true, start: '11:30 AM', end: '11:30 PM' },
  { day: 'Saturday', short: 'Sat', open: true, start: '11:00 AM', end: '11:30 PM' },
  { day: 'Sunday', short: 'Sun', open: false, start: '11:00 AM', end: '9:00 PM' },
];

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
  const [hours, setHours] = useState<DayHours[]>(DEFAULT_HOURS);
  const [picker, setPicker] = useState<PickerTarget>(null);

  const updateDay = (i: number, patch: Partial<DayHours>) => {
    setHours((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  };

  const copyMondayToAll = () => {
    const mon = hours[0];
    setHours(hours.map((d) => ({ ...d, open: mon.open, start: mon.start, end: mon.end })));
  };

  const pickerValue =
    picker && hours[picker.dayIndex] ? hours[picker.dayIndex][picker.field] : null;

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

      <View style={styles.card}>
        {hours.map((d, i) => (
          <View key={d.day} style={[styles.dayRow, i > 0 && styles.rowDivider]}>
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
