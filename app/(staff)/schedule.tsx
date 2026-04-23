import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createStyles, spacing, borderRadius } from '@/lib/theme';
import { useOwnerTabScrollPadding } from '@/hooks/useOwnerTabScrollPadding';
import {
  SCHEDULE_WEEK_DAYS,
  SHIFT_STAFF,
  RESTAURANT_SERVICE_HOURS,
} from '@/lib/mock/ownerApp';

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  pageHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  kickerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: c.gold,
  },
  kickerText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.9,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.9,
    lineHeight: 36,
  },
  pageSub: {
    fontSize: 14,
    color: c.textMuted,
    fontWeight: '500',
    marginTop: 6,
  },

  dayScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    gap: 5,
  },
  dayPillActive: {
    backgroundColor: c.bgElevated,
    borderColor: c.textMuted,
  },
  dayPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.textPrimary,
  },
  dayPillCount: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textMuted,
    marginLeft: 1,
  },
  dayPillCountActive: { color: c.textPrimary },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.4,
  },
  addShiftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addShiftText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.gold,
  },

  staffCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    gap: spacing.md,
    minHeight: 68,
  },
  staffRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  staffRowPressed: { backgroundColor: c.bgElevated },
  staffAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  staffAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: c.bgBase,
    letterSpacing: -0.2,
  },
  staffAvatarOff: {
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  staffAvatarTextOff: { color: c.textMuted },
  staffTextCol: { flex: 1, minWidth: 0 },
  staffName: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  staffRole: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: '500',
  },
  staffOnlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.success,
    marginLeft: 5,
    marginBottom: 1,
  },
  staffRight: { alignItems: 'flex-end', flexShrink: 0 },
  staffShift: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.1,
    textAlign: 'right',
  },
  staffHours: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textMuted,
    marginTop: 3,
    textAlign: 'right',
  },
  staffShiftOff: { color: c.textMuted },

  hoursCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    gap: spacing.sm,
    minHeight: 50,
  },
  hoursRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  hoursLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    flex: 1,
  },
  hoursTimes: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    textAlign: 'right',
    marginRight: 8,
  },
  peakBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: `${c.gold}22`,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${c.gold}55`,
  },
  peakBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: c.gold,
    letterSpacing: 0.4,
  },
}));

export default function OwnerScheduleScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const scrollPad = useOwnerTabScrollPadding();
  const todayIdx = new Date().getDay(); // 0=Sun
  const weekIdx = ((todayIdx + 6) % 7); // convert to Mon=0
  const initialDay = SCHEDULE_WEEK_DAYS[Math.min(weekIdx, SCHEDULE_WEEK_DAYS.length - 1)].key;
  const [selectedDay, setSelectedDay] = useState(initialDay);

  const onShift = SHIFT_STAFF.filter((s) => s.onShift);
  const offShift = SHIFT_STAFF.filter((s) => !s.onShift);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingBottom: scrollPad }}
      >
        {/* ── Header ── */}
        <View style={styles.pageHeader}>
          <View style={styles.kickerRow}>
            <View style={styles.kickerDot} />
            <Text style={styles.kickerText}>SCHEDULE</Text>
          </View>
          <Text style={styles.pageTitle}>Staff &amp; demand</Text>
          <Text style={styles.pageSub}>Plan around peak hours</Text>
        </View>

        {/* ── Day pills ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayScrollContent}
        >
          {SCHEDULE_WEEK_DAYS.map((day) => {
            const active = selectedDay === day.key;
            return (
              <Pressable
                key={day.key}
                onPress={() => setSelectedDay(day.key)}
                style={[styles.dayPill, active && styles.dayPillActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={styles.dayPillText}>{day.key}</Text>
                <Text style={[styles.dayPillCount, active && styles.dayPillCountActive]}>
                  {day.count}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── On shift ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>On shift · {onShift.length}</Text>
          <Pressable style={styles.addShiftBtn} accessibilityRole="button">
            <Text style={styles.addShiftText}>+ Shift</Text>
          </Pressable>
        </View>
        <View style={styles.staffCard}>
          {onShift.map((member, index) => {
            const avatarBg = ['#A07C3E', '#5B7A52', '#4A6A8A'][index % 3];
            return (
              <Pressable
                key={member.id}
                style={({ pressed }) => [
                  styles.staffRow,
                  index > 0 && styles.staffRowDivider,
                  pressed && styles.staffRowPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${member.name}, ${member.role}`}
              >
                <View style={[styles.staffAvatar, { backgroundColor: avatarBg }]}>
                  <Text style={styles.staffAvatarText}>{member.initials}</Text>
                </View>
                <View style={styles.staffTextCol}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.staffName}>{member.name}</Text>
                    <View style={styles.staffOnlineDot} />
                  </View>
                  <Text style={styles.staffRole}>
                    {member.role} · {member.section}
                  </Text>
                </View>
                <View style={styles.staffRight}>
                  <Text style={styles.staffShift}>
                    {member.startTime}–{member.endTime}
                  </Text>
                  <Text style={styles.staffHours}>{member.hours}h</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ── Off shift ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Off · {offShift.length}</Text>
        </View>
        <View style={[styles.staffCard, { marginBottom: spacing.xl }]}>
          {offShift.map((member, index) => (
            <Pressable
              key={member.id}
              style={({ pressed }) => [
                styles.staffRow,
                index > 0 && styles.staffRowDivider,
                pressed && styles.staffRowPressed,
              ]}
              accessibilityRole="button"
            >
              <View style={[styles.staffAvatar, styles.staffAvatarOff]}>
                <Text style={[styles.staffAvatarText, styles.staffAvatarTextOff]}>
                  {member.initials}
                </Text>
              </View>
              <View style={styles.staffTextCol}>
                <Text style={styles.staffName}>{member.name}</Text>
                <Text style={styles.staffRole}>
                  {member.role} · {member.section}
                </Text>
              </View>
              <View style={styles.staffRight}>
                {member.hours > 0 ? (
                  <>
                    <Text style={[styles.staffShift, styles.staffShiftOff]}>
                      {member.startTime}–{member.endTime}
                    </Text>
                    <Text style={styles.staffHours}>{member.hours}h</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.staffShift, styles.staffShiftOff]}>Off</Text>
                    <Text style={styles.staffHours}>0h</Text>
                  </>
                )}
              </View>
            </Pressable>
          ))}
        </View>

        {/* ── Restaurant hours ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Restaurant hours</Text>
        </View>
        <View style={styles.hoursCard}>
          {RESTAURANT_SERVICE_HOURS.map((row, index) => (
            <View
              key={row.label}
              style={[styles.hoursRow, index > 0 && styles.hoursRowDivider]}
            >
              <Text style={styles.hoursLabel}>{row.label}</Text>
              <Text style={styles.hoursTimes}>
                {row.open} – {row.close}
              </Text>
              {row.peak ? (
                <View style={styles.peakBadge}>
                  <Text style={styles.peakBadgeText}>PEAK</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
