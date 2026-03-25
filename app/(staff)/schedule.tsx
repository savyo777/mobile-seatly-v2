import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper, Card } from '@/components/ui';
import { colors, spacing, borderRadius, typography, shadows } from '@/lib/theme';

interface MockShift {
  id: string;
  weekdayIndex: number;
  start: string;
  end: string;
  roleKey: string;
}

const MOCK_SHIFTS: MockShift[] = [
  { id: 's1', weekdayIndex: 0, start: '4:00 PM', end: '11:00 PM', roleKey: 'staff.shiftRoleServer' },
  { id: 's2', weekdayIndex: 2, start: '4:00 PM', end: '11:00 PM', roleKey: 'staff.shiftRoleServer' },
  { id: 's3', weekdayIndex: 4, start: '5:00 PM', end: '12:00 AM', roleKey: 'staff.shiftRoleHost' },
  { id: 's4', weekdayIndex: 5, start: '5:00 PM', end: '12:00 AM', roleKey: 'staff.shiftRoleServer' },
  { id: 's5', weekdayIndex: 6, start: '10:00 AM', end: '4:00 PM', roleKey: 'staff.shiftRoleBar' },
];

function startOfMonday(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

export default function StaffScheduleScreen() {
  const { t } = useTranslation();
  const [weekOffset, setWeekOffset] = useState(0);

  const { monday, days } = useMemo(() => {
    const base = startOfMonday(new Date());
    const m = addDays(base, weekOffset * 7);
    const dlist: Date[] = [];
    for (let i = 0; i < 7; i++) {
      dlist.push(addDays(m, i));
    }
    return { monday: m, days: dlist };
  }, [weekOffset]);

  const weekLabel = useMemo(() => {
    const end = addDays(monday, 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${fmt(monday)} – ${fmt(end)}`;
  }, [monday]);

  const dayLabels = t('staff.weekDaysShort', { returnObjects: true }) as string[];

  return (
    <ScreenWrapper scrollable={false} padded>
      <Text style={styles.screenTitle}>{t('staff.mySchedule')}</Text>

      <View style={styles.weekNav}>
        <TouchableOpacity
          onPress={() => setWeekOffset((w) => w - 1)}
          style={styles.navBtn}
          hitSlop={12}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={22} color={colors.gold} />
        </TouchableOpacity>
        <View style={styles.weekCenter}>
          <Text style={styles.weekBadge}>{t('staff.thisWeekLabel')}</Text>
          <Text style={styles.weekRange}>{weekLabel}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setWeekOffset((w) => w + 1)}
          style={styles.navBtn}
          hitSlop={12}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-forward" size={22} color={colors.gold} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
        {days.map((day, col) => {
          const today = new Date();
          const isToday = isSameDay(day, today);
          const shifts = MOCK_SHIFTS.filter((s) => s.weekdayIndex === col);
          return (
            <View key={day.toISOString()} style={[styles.col, isToday && styles.colToday]}>
              <Text style={styles.dayName}>{dayLabels[col]}</Text>
              <Text style={styles.dayNum}>{day.getDate()}</Text>
              {shifts.map((s) => (
                <Card key={s.id} style={styles.shiftCard} padded>
                  <Text style={styles.shiftTime}>
                    {s.start} – {s.end}
                  </Text>
                  <Text style={styles.shiftRole}>{t(s.roleKey)}</Text>
                </Card>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing['2xl'],
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekCenter: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  weekBadge: {
    ...typography.label,
    color: colors.gold,
  },
  weekRange: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  rowScroll: {
    paddingBottom: spacing['4xl'],
    gap: spacing.sm,
  },
  col: {
    width: 112,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSurface,
    padding: spacing.sm,
    minHeight: 280,
  },
  colToday: {
    borderColor: colors.gold,
    borderWidth: 2,
    ...shadows.goldGlow,
  },
  dayName: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
  },
  dayNum: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  shiftCard: {
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    borderColor: colors.gold,
    marginBottom: spacing.sm,
  },
  shiftTime: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  shiftRole: {
    ...typography.bodySmall,
    color: colors.gold,
    marginTop: spacing.xs,
  },
});
