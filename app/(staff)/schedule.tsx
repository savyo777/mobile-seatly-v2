import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  Switch,
  LayoutAnimation,
  UIManager,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import {
  ScheduleBottomSheet,
  ScheduleCenterModal,
  SheetPrimaryButton,
  SheetSecondaryButton,
} from '@/components/owner/ScheduleBottomSheet';
import { ownerRadii } from '@/lib/theme/ownerTheme';
import { ownerSpace } from '@/lib/theme/ownerTheme';

const BG = '#000000';
const CARD = '#111111';
const CARD_RAISED = '#1A1A1A';
const GOLD = '#C6A85B';
const TEXT = '#FFFFFF';
const TEXT_MUTED = '#A1A1AA';
const TEXT_SOFT = '#71717A';
const BORDER = 'rgba(255,255,255,0.08)';
const TAB_BAR_SCROLL_PADDING = 110;
const PAD_H = 16;
const SECTION_GAP = 22;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ShiftStatus = 'scheduled' | 'completed' | 'understaffed' | 'conflict';

type DayHint = 'understaffed' | 'busyNight' | 'overtime';

export interface OwnerShift {
  id: string;
  staffNameKey: string;
  start: string;
  end: string;
  hours: number;
  roleKey: string;
  sectionKey: string;
  status: ShiftStatus;
  notes?: string;
}

interface OwnerDay {
  date: Date;
  shifts: OwnerShift[];
  hints: DayHint[];
}

const STAFF_KEYS = [
  'staff.scheduleStaffAlex',
  'staff.scheduleStaffSam',
  'staff.scheduleStaffJordan',
  'staff.scheduleStaffMorgan',
] as const;

const ROLE_KEYS = ['staff.shiftRoleServer', 'staff.shiftRoleHost', 'staff.shiftRoleBar'] as const;
const SECTION_KEYS = ['staff.scheduleSectionPatio', 'staff.scheduleSectionMain'] as const;

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

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

function weekKeyFromMonday(monday: Date): string {
  return startOfMonday(monday).toISOString().slice(0, 10);
}

function buildOwnerWeekRaw(monday: Date): OwnerDay[] {
  const base = monday.getTime();
  const mk = (
    dayIndex: number,
    sid: string,
    partial: Omit<OwnerShift, 'id' | 'status'> & { status?: ShiftStatus },
  ): OwnerShift => ({
    id: `${base}-d${dayIndex}-${sid}`,
    staffNameKey: partial.staffNameKey,
    start: partial.start,
    end: partial.end,
    hours: partial.hours,
    roleKey: partial.roleKey,
    sectionKey: partial.sectionKey,
    status: partial.status ?? 'scheduled',
    notes: partial.notes,
  });

  return [
    {
      date: addDays(monday, 0),
      shifts: [
        mk(0, 'a', {
          staffNameKey: 'staff.scheduleStaffAlex',
          start: '4:00 PM',
          end: '11:00 PM',
          hours: 7,
          roleKey: 'staff.shiftRoleServer',
          sectionKey: 'staff.scheduleSectionPatio',
          notes: '',
        }),
      ],
      hints: [],
    },
    { date: addDays(monday, 1), shifts: [], hints: ['understaffed'] },
    {
      date: addDays(monday, 2),
      shifts: [
        mk(2, 'a', {
          staffNameKey: 'staff.scheduleStaffAlex',
          start: '10:00 AM',
          end: '3:00 PM',
          hours: 5,
          roleKey: 'staff.shiftRoleServer',
          sectionKey: 'staff.scheduleSectionPatio',
        }),
        mk(2, 'b', {
          staffNameKey: 'staff.scheduleStaffAlex',
          start: '5:00 PM',
          end: '11:00 PM',
          hours: 6,
          roleKey: 'staff.shiftRoleServer',
          sectionKey: 'staff.scheduleSectionMain',
        }),
      ],
      hints: [],
    },
    { date: addDays(monday, 3), shifts: [], hints: [] },
    {
      date: addDays(monday, 4),
      shifts: [
        mk(4, 'a', {
          staffNameKey: 'staff.scheduleStaffMorgan',
          start: '5:00 PM',
          end: '12:00 AM',
          hours: 7,
          roleKey: 'staff.shiftRoleHost',
          sectionKey: 'staff.scheduleSectionMain',
          status: 'conflict',
        }),
      ],
      hints: [],
    },
    {
      date: addDays(monday, 5),
      shifts: [
        mk(5, 'a', {
          staffNameKey: 'staff.scheduleStaffSam',
          start: '5:00 PM',
          end: '12:00 AM',
          hours: 7,
          roleKey: 'staff.shiftRoleServer',
          sectionKey: 'staff.scheduleSectionMain',
        }),
      ],
      hints: ['busyNight'],
    },
    {
      date: addDays(monday, 6),
      shifts: [
        mk(6, 'a', {
          staffNameKey: 'staff.scheduleStaffAlex',
          start: '10:00 AM',
          end: '4:00 PM',
          hours: 6,
          roleKey: 'staff.shiftRoleBar',
          sectionKey: 'staff.scheduleSectionMain',
          status: 'understaffed',
        }),
      ],
      hints: ['overtime'],
    },
  ];
}

function applyPastCompleted(days: OwnerDay[], now: Date): OwnerDay[] {
  const todayStart = startOfDay(now);
  return days.map((d) => ({
    ...d,
    shifts: d.shifts.map((s) => {
      if (startOfDay(d.date) >= todayStart) return { ...s };
      if (s.status === 'conflict' || s.status === 'understaffed') return { ...s };
      return { ...s, status: 'completed' as const };
    }),
  }));
}

function generateAutoWeek(monday: Date, level: number): OwnerDay[] {
  const raw = buildOwnerWeekRaw(monday);
  const mk = (idx: number, sid: string, s: Omit<OwnerShift, 'id' | 'status'>): OwnerShift => ({
    id: `gen-${monday.getTime()}-${idx}-${sid}`,
    ...s,
    status: 'scheduled',
  });
  return raw.map((d, i) => {
    if (d.shifts.length > 0) return d;
    const fill = Math.max(2, Math.min(5, level + 2));
    return {
      ...d,
      shifts: [
        mk(i, 'a', {
          staffNameKey: 'staff.scheduleStaffJordan',
          start: '4:00 PM',
          end: `${fill + 5}:00 PM`,
          hours: 6,
          roleKey: 'staff.shiftRoleServer',
          sectionKey: 'staff.scheduleSectionMain',
        }),
      ],
      hints: d.hints.filter((h) => h !== 'understaffed'),
    };
  });
}

function totalShiftCount(days: OwnerDay[]): number {
  return days.reduce((acc, d) => acc + d.shifts.length, 0);
}

function totalHours(days: OwnerDay[]): number {
  return days.reduce((acc, d) => acc + d.shifts.reduce((a, s) => a + s.hours, 0), 0);
}

function findNextShiftLabel(days: OwnerDay[], dayLabels: string[], now: Date): string | null {
  const sod = startOfDay(now);
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    if (d.shifts.length === 0) continue;
    if (startOfDay(d.date) < sod) continue;
    const label = dayLabels[i] ?? '';
    return `${label} ${d.shifts[0].start}`;
  }
  return null;
}

const screenH = Dimensions.get('window').height;

export default function StaffScheduleScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekOverrides, setWeekOverrides] = useState<Record<string, OwnerDay[]>>({});

  const [detail, setDetail] = useState<{ shift: OwnerShift; dayDate: Date; mondayKey: string } | null>(
    null,
  );
  const [noteDraft, setNoteDraft] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createDay, setCreateDay] = useState(0);
  const [formStaff, setFormStaff] = useState<(typeof STAFF_KEYS)[number]>(STAFF_KEYS[0]);
  const [formStart, setFormStart] = useState('4:00 PM');
  const [formEnd, setFormEnd] = useState('11:00 PM');
  const [formRole, setFormRole] = useState<(typeof ROLE_KEYS)[number]>(ROLE_KEYS[0]);
  const [formSection, setFormSection] = useState<(typeof SECTION_KEYS)[number]>(SECTION_KEYS[0]);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);

  const [autoOpen, setAutoOpen] = useState(false);
  const [autoLevel, setAutoLevel] = useState(3);
  const [autoServer, setAutoServer] = useState(true);
  const [autoHost, setAutoHost] = useState(true);
  const [autoBar, setAutoBar] = useState(false);
  const [autoPeak, setAutoPeak] = useState(true);

  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ shiftId: string; mondayKey: string } | null>(null);
  const [assignOpen, setAssignOpen] = useState<{ shift: OwnerShift; mondayKey: string } | null>(null);
  const [quickOpen, setQuickOpen] = useState<{ shift: OwnerShift; dayDate: Date; mondayKey: string } | null>(
    null,
  );
  const [toast, setToast] = useState<string | null>(null);

  const dayLabels = t('staff.weekDaysShort', { returnObjects: true }) as string[];

  const monday = useMemo(() => {
    const base = startOfMonday(new Date());
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  const mondayKey = useMemo(() => weekKeyFromMonday(monday), [monday]);

  const weekDays = useMemo(() => {
    const raw = weekOverrides[mondayKey] ?? buildOwnerWeekRaw(monday);
    return applyPastCompleted(raw, new Date());
  }, [monday, mondayKey, weekOverrides]);

  useEffect(() => {
    if (detail) {
      setNoteDraft(detail.shift.notes ?? '');
    }
  }, [detail]);

  const persistWeek = useCallback((key: string, days: OwnerDay[]) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setWeekOverrides((prev) => ({ ...prev, [key]: days }));
  }, []);

  const weekRangeText = useMemo(() => {
    const end = addDays(monday, 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${fmt(monday)} – ${fmt(end)}`;
  }, [monday]);

  const summary = useMemo(() => {
    const shifts = totalShiftCount(weekDays);
    const hrs = totalHours(weekDays);
    const hoursStr = `${hrs} ${t('staff.scheduleHrs')}`;
    const next = findNextShiftLabel(weekDays, dayLabels, new Date());
    return { shifts, hoursStr, next };
  }, [weekDays, dayLabels, t]);

  const paddingBottom = TAB_BAR_SCROLL_PADDING + insets.bottom;
  const sheetMaxH = Math.min(screenH * 0.88, screenH - insets.top - 24);

  const openDetail = useCallback(
    (shift: OwnerShift, dayDate: Date) => {
      setDetail({ shift, dayDate, mondayKey });
      setNoteDraft(shift.notes ?? '');
    },
    [mondayKey],
  );

  const closeDetail = useCallback(() => setDetail(null), []);

  const saveNotes = useCallback(() => {
    if (!detail) return;
    const days = weekDays.map((d) =>
      startOfDay(d.date).getTime() === startOfDay(detail.dayDate).getTime()
        ? {
            ...d,
            shifts: d.shifts.map((s) =>
              s.id === detail.shift.id ? { ...s, notes: noteDraft.trim() } : s,
            ),
          }
        : d,
    );
    persistWeek(mondayKey, days);
    setDetail((prev) =>
      prev && prev.shift.id === detail.shift.id
        ? { ...prev, shift: { ...prev.shift, notes: noteDraft.trim() } }
        : prev,
    );
  }, [detail, mondayKey, noteDraft, persistWeek, weekDays]);

  const deleteShift = useCallback(
    (shiftId: string) => {
      const days = weekDays.map((d) => ({
        ...d,
        shifts: d.shifts.filter((s) => s.id !== shiftId),
      }));
      persistWeek(mondayKey, days);
      setDetail(null);
      setQuickOpen(null);
      setAssignOpen(null);
    },
    [mondayKey, persistWeek, weekDays],
  );

  const markComplete = useCallback(() => {
    if (!detail) return;
    const days = weekDays.map((d) =>
      startOfDay(d.date).getTime() === startOfDay(detail.dayDate).getTime()
        ? {
            ...d,
            shifts: d.shifts.map((s) =>
              s.id === detail.shift.id ? { ...s, status: 'completed' as const } : s,
            ),
          }
        : d,
    );
    persistWeek(mondayKey, days);
    closeDetail();
    setToast(t('staff.scheduleMarkComplete'));
    setTimeout(() => setToast(null), 2200);
  }, [closeDetail, detail, mondayKey, persistWeek, t, weekDays]);

  const duplicateShift = useCallback(() => {
    if (!detail) return;
    const s = detail.shift;
    const copy: OwnerShift = {
      ...s,
      id: `dup-${Date.now()}`,
      status: 'scheduled',
    };
    const days = weekDays.map((d) =>
      startOfDay(d.date).getTime() === startOfDay(detail.dayDate).getTime()
        ? { ...d, shifts: [...d.shifts, copy] }
        : d,
    );
    persistWeek(mondayKey, days);
    closeDetail();
  }, [closeDetail, detail, mondayKey, persistWeek, weekDays]);

  const assignStaff = useCallback(
    (key: (typeof STAFF_KEYS)[number]) => {
      if (!assignOpen) return;
      const days = weekDays.map((d) => ({
        ...d,
        shifts: d.shifts.map((s) =>
          s.id === assignOpen.shift.id ? { ...s, staffNameKey: key } : s,
        ),
      }));
      persistWeek(mondayKey, days);
      setAssignOpen(null);
      setDetail((prev) =>
        prev && prev.shift.id === assignOpen.shift.id
          ? { ...prev, shift: { ...prev.shift, staffNameKey: key } }
          : prev,
      );
    },
    [assignOpen, mondayKey, persistWeek, weekDays],
  );

  const openCreate = useCallback(() => {
    setEditingShiftId(null);
    setCreateDay(0);
    setFormStaff(STAFF_KEYS[0]);
    setFormStart('4:00 PM');
    setFormEnd('11:00 PM');
    setFormRole(ROLE_KEYS[0]);
    setFormSection(SECTION_KEYS[0]);
    setCreateOpen(true);
  }, []);

  const openEdit = useCallback(() => {
    if (!detail) return;
    const s = detail.shift;
    const idx = weekDays.findIndex(
      (d) => startOfDay(d.date).getTime() === startOfDay(detail.dayDate).getTime(),
    );
    setEditingShiftId(s.id);
    setCreateDay(idx >= 0 ? idx : 0);
    setFormStaff(s.staffNameKey as (typeof STAFF_KEYS)[number]);
    setFormStart(s.start);
    setFormEnd(s.end);
    setFormRole(s.roleKey as (typeof ROLE_KEYS)[number]);
    setFormSection(s.sectionKey as (typeof SECTION_KEYS)[number]);
    setCreateOpen(false);
    setEditOpen(true);
    closeDetail();
  }, [closeDetail, detail, weekDays]);

  const saveShiftForm = useCallback(() => {
    const hours = 7;
    const newShift: OwnerShift = {
      id: editingShiftId ?? `new-${Date.now()}`,
      staffNameKey: formStaff,
      start: formStart.trim(),
      end: formEnd.trim(),
      hours,
      roleKey: formRole,
      sectionKey: formSection,
      status: 'scheduled',
    };

    if (editingShiftId) {
      const days = weekDays.map((d) => ({
        ...d,
        shifts: d.shifts.map((s) => (s.id === editingShiftId ? { ...newShift, notes: s.notes } : s)),
      }));
      persistWeek(mondayKey, days);
      setEditingShiftId(null);
      setEditOpen(false);
      return;
    }

    const days = weekDays.map((d, i) =>
      i === createDay ? { ...d, shifts: [...d.shifts, newShift] } : d,
    );
    persistWeek(mondayKey, days);
    setCreateOpen(false);
  }, [
    createDay,
    editingShiftId,
    formEnd,
    formRole,
    formSection,
    formStaff,
    formStart,
    mondayKey,
    persistWeek,
    weekDays,
  ]);

  const runAutoSchedule = useCallback(() => {
    const gen = generateAutoWeek(monday, autoLevel);
    void autoServer;
    void autoHost;
    void autoBar;
    void autoPeak;
    persistWeek(mondayKey, gen);
    setAutoOpen(false);
    setToast(t('staff.scheduleGeneratedOk'));
    setTimeout(() => setToast(null), 2200);
  }, [autoLevel, monday, mondayKey, persistWeek, t, autoServer, autoHost, autoBar, autoPeak]);

  const headerRight = (
    <View style={styles.headerIcons}>
      <Pressable
        onPress={() => setWeekPickerOpen(true)}
        style={({ pressed }) => [styles.headerIconGhost, pressed && styles.pressed]}
        accessibilityLabel={t('staff.scheduleJumpWeek')}
      >
        <Ionicons name="calendar-outline" size={20} color={GOLD} />
      </Pressable>
      <Pressable
        onPress={() => router.push('/(staff)/settings' as never)}
        style={({ pressed }) => [styles.headerIconGhost, pressed && styles.pressed]}
        accessibilityLabel={t('owner.settingsTitle')}
      >
        <Ionicons name="settings-outline" size={20} color={GOLD} />
      </Pressable>
    </View>
  );

  const statusBadge = (s: OwnerShift) => {
    if (s.status === 'conflict') {
      return <Text style={styles.badgeConflict}>{t('staff.scheduleOwnerBadgeConflict')}</Text>;
    }
    if (s.status === 'understaffed') {
      return <Text style={styles.badgeUnder}>{t('staff.scheduleOwnerBadgeUnderstaffed')}</Text>;
    }
    if (s.status === 'completed') {
      return <Text style={styles.badgeCompleted}>{t('staff.scheduleOwnerBadgeCompleted')}</Text>;
    }
    return <Text style={styles.badgeScheduled}>{t('staff.scheduleOwnerBadgeScheduled')}</Text>;
  };

  const hintLabel = (h: DayHint) => {
    if (h === 'understaffed') return `⚠️ ${t('staff.scheduleHintUnderstaffed')}`;
    if (h === 'busyNight') return `🔥 ${t('staff.scheduleHintBusyNight')}`;
    return `⚡ ${t('staff.scheduleHintOvertime')}`;
  };

  const avatarLetter = (nameKey: string) => t(nameKey).trim().charAt(0).toUpperCase();

  return (
    <>
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom }]}
          keyboardShouldPersistTaps="handled"
        >
          <SubpageHeader
            compact
            title={t('staff.mySchedule')}
            subtitle={undefined}
            fallbackTab="more"
            rightAction={headerRight}
          />

          <View style={styles.divider} />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            style={styles.chipScroll}
          >
            <Pressable
              onPress={openCreate}
              style={({ pressed }) => [styles.chipPrimary, pressed && styles.chipPrimaryPressed]}
            >
              <Ionicons name="add" size={18} color={BG} />
              <Text style={styles.chipPrimaryText}>{t('staff.scheduleAddShift')}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(staff)/staff' as never)}
              style={({ pressed }) => [styles.chipSecondary, pressed && styles.chipSecondaryPressed]}
            >
              <Ionicons name="people-outline" size={18} color={GOLD} />
              <Text style={styles.chipSecondaryText}>{t('staff.scheduleManageStaff')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setAutoOpen(true)}
              style={({ pressed }) => [styles.chipSecondary, pressed && styles.chipSecondaryPressed]}
            >
              <Ionicons name="sparkles" size={18} color={GOLD} />
              <Text style={styles.chipSecondaryText}>
                {t('staff.scheduleAutoSchedule')} · {t('staff.scheduleChipAi')}
              </Text>
            </Pressable>
          </ScrollView>

          <View style={styles.weekNav}>
            <Pressable
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setWeekOffset((w) => w - 1);
              }}
              style={({ pressed }) => [styles.weekArrow, pressed && styles.pressed]}
              accessibilityLabel={t('staff.schedulePrevWeek')}
            >
              <Ionicons name="chevron-back" size={22} color={TEXT} />
            </Pressable>
            <Text style={styles.weekRange}>{weekRangeText}</Text>
            <Pressable
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setWeekOffset((w) => w + 1);
              }}
              style={({ pressed }) => [styles.weekArrow, pressed && styles.pressed]}
              accessibilityLabel={t('staff.scheduleNextWeek')}
            >
              <Ionicons name="chevron-forward" size={22} color={TEXT} />
            </Pressable>
          </View>

          <View style={styles.dividerLight} />

          <Text style={styles.summaryLine}>
            {summary.next
              ? t('staff.scheduleSummaryOneLine', {
                  shifts: summary.shifts,
                  hours: summary.hoursStr,
                  next: summary.next,
                })
              : t('staff.scheduleSummaryOneLineNoNext', {
                  shifts: summary.shifts,
                  hours: summary.hoursStr,
                })}
          </Text>

          <View style={styles.dayList}>
            {weekDays.map((d, index) => {
              const today = new Date();
              const isToday = isSameDay(d.date, today);
              const dayShort = dayLabels[index] ?? '';
              const header = `${dayShort} ${d.date.getDate()}`.toUpperCase();
              const isDouble = d.shifts.length > 1;
              const empty = d.shifts.length === 0;

              if (empty) {
                return (
                  <Animated.View
                    key={d.date.toISOString()}
                    entering={FadeInDown.delay(index * 40)}>
                    <View style={[styles.dayCard, styles.dayCardEmpty, isToday && styles.dayCardToday]}>
                      <Text style={styles.dayHeader}>{header}</Text>
                      {d.hints.includes('understaffed') ? (
                        <View style={styles.badgeRow}>
                          <Text style={styles.badgeUnder}>{t('staff.scheduleOwnerBadgeUnderstaffed')}</Text>
                        </View>
                      ) : null}
                      {d.hints.length > 0 ? (
                        <View style={styles.hintRow}>
                          {d.hints.map((h) => (
                            <Text key={h} style={styles.hintMini}>
                              {hintLabel(h)}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                      <Text style={styles.noShifts}>{t('staff.scheduleNoShiftsDay')}</Text>
                    </View>
                  </Animated.View>
                );
              }

              return (
                <Animated.View
                  key={d.date.toISOString()}
                  entering={FadeInDown.delay(index * 40)}>
                  <View style={[styles.dayCard, isToday && styles.dayCardToday]}>
                    <View style={styles.dayHeadRow}>
                      <Text style={styles.dayHeader}>{header}</Text>
                      {isDouble ? (
                        <Text style={styles.doubleBadge}>{t('staff.scheduleDoubleShiftBadge')}</Text>
                      ) : null}
                    </View>
                    {d.hints.length > 0 ? (
                      <View style={styles.hintRow}>
                        {d.hints.map((h) => (
                          <Text key={h} style={styles.hintMini}>
                            {hintLabel(h)}
                          </Text>
                        ))}
                      </View>
                    ) : null}

                    {d.shifts.map((s, si) => (
                      <Pressable
                        key={s.id}
                        onPress={() => openDetail(s, d.date)}
                        onLongPress={() =>
                          setQuickOpen({ shift: s, dayDate: d.date, mondayKey })
                        }
                        style={({ pressed }) => [
                          styles.shiftRow,
                          si > 0 && styles.shiftRowSplit,
                          pressed && styles.shiftRowPressed,
                        ]}
                      >
                        <View style={styles.avatar}>
                          <Text style={styles.avatarTxt}>{avatarLetter(s.staffNameKey)}</Text>
                        </View>
                        <View style={styles.shiftBody}>
                          <Text style={styles.shiftTime}>
                            {s.start} – {s.end}
                          </Text>
                          <View style={styles.nameRow}>
                            <Text style={styles.staffName}>{t(s.staffNameKey)}</Text>
                          </View>
                          <Text style={styles.shiftRole}>{t(s.roleKey)}</Text>
                          <Text style={styles.shiftLoc}>
                            {t(s.sectionKey)} · {t('staff.scheduleLocationShort')}
                          </Text>
                          <View style={styles.badgeRow}>{statusBadge(s)}</View>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>

        {toast ? (
          <View style={[styles.toast, { bottom: insets.bottom + 100 }]}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}
      </SafeAreaView>

      <Modal visible={detail != null} transparent animationType="slide" onRequestClose={closeDetail}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalDim} onPress={closeDetail} />
          {detail ? (
            <View style={[styles.sheetOuter, { maxHeight: sheetMaxH, paddingBottom: insets.bottom + ownerSpace.md }]}>
              <View style={styles.sheetGrab} />
              <Text style={styles.sheetKicker}>{t('staff.scheduleSheetShiftTitle')}</Text>
              <Text style={styles.sheetDate}>
                {detail.dayDate.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              <ScrollView
                style={styles.sheetScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.sheetDetailBlock}>
                  <Text style={styles.sheetTimeBig}>
                    {detail.shift.start} – {detail.shift.end}
                  </Text>
                  <Text style={styles.sheetName}>{t(detail.shift.staffNameKey)}</Text>
                  <Text style={styles.sheetLine}>{t(detail.shift.roleKey)}</Text>
                  <Text style={styles.sheetMuted}>
                    {t(detail.shift.sectionKey)} · {t('staff.scheduleLocationShort')}
                  </Text>
                  <Text style={styles.notesLabel}>{t('staff.scheduleShiftNotes')}</Text>
                  <TextInput
                    value={noteDraft}
                    onChangeText={setNoteDraft}
                    onBlur={saveNotes}
                    placeholder={t('staff.scheduleShiftNotes')}
                    placeholderTextColor={TEXT_SOFT}
                    style={styles.notesInput}
                    multiline
                  />
                </View>

                {[
                  { icon: 'create-outline' as const, label: t('staff.scheduleActionEdit'), onPress: openEdit },
                  {
                    icon: 'checkmark-circle-outline' as const,
                    label: t('staff.scheduleMarkComplete'),
                    onPress: markComplete,
                  },
                  {
                    icon: 'person-outline' as const,
                    label: t('staff.scheduleActionAssign'),
                    onPress: () => {
                      setAssignOpen({ shift: detail.shift, mondayKey });
                      closeDetail();
                    },
                  },
                  { icon: 'copy-outline' as const, label: t('staff.scheduleDuplicate'), onPress: duplicateShift },
                  {
                    icon: 'trash-outline' as const,
                    label: t('staff.scheduleActionDelete'),
                    onPress: () => {
                      setDeleteConfirm({ shiftId: detail.shift.id, mondayKey });
                      closeDetail();
                    },
                  },
                ].map((row) => (
                  <Pressable
                    key={row.label}
                    style={({ pressed }) => [styles.sheetAction, pressed && styles.pressed]}
                    onPress={row.onPress}
                  >
                    <Ionicons name={row.icon} size={22} color={GOLD} />
                    <Text style={styles.sheetActionText}>{row.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable onPress={closeDetail} style={styles.sheetDone}>
                <Text style={styles.sheetDoneText}>{t('staff.scheduleClose')}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>

      <ScheduleBottomSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('staff.scheduleCreateShiftTitle')}
        subtitle={t('staff.scheduleDaySection')}
      >
        <View style={styles.dayPick}>
          {DAY_IDX.map((i) => (
            <Pressable
              key={i}
              onPress={() => setCreateDay(i)}
              style={[styles.dayPickBtn, createDay === i && styles.dayPickBtnOn]}
            >
              <Text style={[styles.dayPickTxt, createDay === i && styles.dayPickTxtOn]}>
                {dayLabels[i]}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.formLabel}>{t('staff.scheduleStaffSection')}</Text>
        <View style={styles.pillRow}>
          {STAFF_KEYS.map((k) => (
            <Pressable
              key={k}
              onPress={() => setFormStaff(k)}
              style={[styles.pill, formStaff === k && styles.pillOn]}
            >
              <Text style={[styles.pillTxt, formStaff === k && styles.pillTxtOn]}>{t(k)}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.formLabel}>{t('staff.scheduleStartLabel')}</Text>
        <TextInput
          value={formStart}
          onChangeText={setFormStart}
          style={styles.input}
          placeholderTextColor={TEXT_SOFT}
        />
        <Text style={styles.formLabel}>{t('staff.scheduleEndLabel')}</Text>
        <TextInput
          value={formEnd}
          onChangeText={setFormEnd}
          style={styles.input}
          placeholderTextColor={TEXT_SOFT}
        />
        <Text style={styles.formLabel}>{t('staff.scheduleRolesLabel')}</Text>
        <View style={styles.pillRow}>
          {ROLE_KEYS.map((k) => (
            <Pressable key={k} onPress={() => setFormRole(k)} style={[styles.pill, formRole === k && styles.pillOn]}>
              <Text style={[styles.pillTxt, formRole === k && styles.pillTxtOn]}>{t(k)}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.pillRow}>
          {SECTION_KEYS.map((k) => (
            <Pressable
              key={k}
              onPress={() => setFormSection(k)}
              style={[styles.pill, formSection === k && styles.pillOn]}
            >
              <Text style={[styles.pillTxt, formSection === k && styles.pillTxtOn]}>{t(k)}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.formActions}>
          <SheetSecondaryButton label={t('common.cancel')} onPress={() => setCreateOpen(false)} />
          <SheetPrimaryButton label={t('staff.scheduleSaveShift')} onPress={saveShiftForm} />
        </View>
      </ScheduleBottomSheet>

      <ScheduleBottomSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        title={t('staff.scheduleEditShiftTitle')}
      >
        <Text style={styles.formLabel}>{t('staff.scheduleStaffSection')}</Text>
        <View style={styles.pillRow}>
          {STAFF_KEYS.map((k) => (
            <Pressable
              key={k}
              onPress={() => setFormStaff(k)}
              style={[styles.pill, formStaff === k && styles.pillOn]}
            >
              <Text style={[styles.pillTxt, formStaff === k && styles.pillTxtOn]}>{t(k)}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.formLabel}>{t('staff.scheduleStartLabel')}</Text>
        <TextInput
          value={formStart}
          onChangeText={setFormStart}
          style={styles.input}
          placeholderTextColor={TEXT_SOFT}
        />
        <Text style={styles.formLabel}>{t('staff.scheduleEndLabel')}</Text>
        <TextInput
          value={formEnd}
          onChangeText={setFormEnd}
          style={styles.input}
          placeholderTextColor={TEXT_SOFT}
        />
        <Text style={styles.formLabel}>{t('staff.scheduleRolesLabel')}</Text>
        <View style={styles.pillRow}>
          {ROLE_KEYS.map((k) => (
            <Pressable key={k} onPress={() => setFormRole(k)} style={[styles.pill, formRole === k && styles.pillOn]}>
              <Text style={[styles.pillTxt, formRole === k && styles.pillTxtOn]}>{t(k)}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.pillRow}>
          {SECTION_KEYS.map((k) => (
            <Pressable
              key={k}
              onPress={() => setFormSection(k)}
              style={[styles.pill, formSection === k && styles.pillOn]}
            >
              <Text style={[styles.pillTxt, formSection === k && styles.pillTxtOn]}>{t(k)}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.formActions}>
          <SheetSecondaryButton label={t('common.cancel')} onPress={() => setEditOpen(false)} />
          <SheetPrimaryButton label={t('staff.scheduleSaveShift')} onPress={saveShiftForm} />
        </View>
      </ScheduleBottomSheet>

      <ScheduleBottomSheet
        visible={autoOpen}
        onClose={() => setAutoOpen(false)}
        title={t('staff.scheduleAutoTitle')}
        subtitle={t('staff.scheduleAutoBody')}
      >
        <Text style={styles.formLabel}>{t('staff.scheduleStaffingLevel')}</Text>
        <View style={styles.levelRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              onPress={() => setAutoLevel(n)}
              style={[styles.levelDot, autoLevel === n && styles.levelDotOn]}
            >
              <Text style={[styles.levelDotTxt, autoLevel === n && styles.levelDotTxtOn]}>{n}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.formLabel}>{t('staff.scheduleRolesLabel')}</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLbl}>{t('staff.shiftRoleServer')}</Text>
          <Switch value={autoServer} onValueChange={setAutoServer} trackColor={{ false: '#333', true: GOLD }} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLbl}>{t('staff.shiftRoleHost')}</Text>
          <Switch value={autoHost} onValueChange={setAutoHost} trackColor={{ false: '#333', true: GOLD }} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLbl}>{t('staff.shiftRoleBar')}</Text>
          <Switch value={autoBar} onValueChange={setAutoBar} trackColor={{ false: '#333', true: GOLD }} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLbl}>{t('staff.schedulePeakLabel')}</Text>
          <Switch value={autoPeak} onValueChange={setAutoPeak} trackColor={{ false: '#333', true: GOLD }} />
        </View>
        <View style={styles.formActions}>
          <SheetSecondaryButton label={t('common.cancel')} onPress={() => setAutoOpen(false)} />
          <SheetPrimaryButton label={t('staff.scheduleGenerate')} onPress={runAutoSchedule} />
        </View>
      </ScheduleBottomSheet>

      <ScheduleBottomSheet
        visible={weekPickerOpen}
        onClose={() => setWeekPickerOpen(false)}
        title={t('staff.scheduleWeekPickerTitle')}
        scrollable={false}
      >
        {[-2, -1, 0, 1, 2].map((off) => (
          <Pressable
            key={off}
            style={({ pressed }) => [styles.weekPickRow, weekOffset === off && styles.weekPickRowOn, pressed && styles.pressed]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setWeekOffset(off);
              setWeekPickerOpen(false);
            }}
          >
            <Text style={styles.weekPickTxt}>
              {(() => {
                const m = addDays(startOfMonday(new Date()), off * 7);
                const end = addDays(m, 6);
                const fmt = (d: Date) =>
                  d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                return `${fmt(m)} – ${fmt(end)}`;
              })()}
            </Text>
            {off === 0 ? (
              <Text style={styles.weekPickBadge}>{t('staff.thisWeekLabel')}</Text>
            ) : null}
          </Pressable>
        ))}
        <SheetSecondaryButton label={t('staff.scheduleClose')} onPress={() => setWeekPickerOpen(false)} />
      </ScheduleBottomSheet>

      <ScheduleBottomSheet
        visible={assignOpen != null}
        onClose={() => setAssignOpen(null)}
        title={t('staff.scheduleAssignTitle')}
        scrollable={false}
      >
        {STAFF_KEYS.map((k) => (
          <Pressable
            key={k}
            style={({ pressed }) => [styles.assignRow, pressed && styles.pressed]}
            onPress={() => assignStaff(k)}
          >
            <Text style={styles.assignTxt}>{t(k)}</Text>
            <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
          </Pressable>
        ))}
      </ScheduleBottomSheet>

      <ScheduleBottomSheet
        visible={quickOpen != null}
        onClose={() => setQuickOpen(null)}
        title={t('staff.scheduleQuickActions')}
        scrollable={false}
      >
        {quickOpen ? (
          <>
            <SheetPrimaryButton
              label={t('staff.scheduleActionEdit')}
              onPress={() => {
                if (!quickOpen) return;
                setDetail({
                  shift: quickOpen.shift,
                  dayDate: quickOpen.dayDate,
                  mondayKey: quickOpen.mondayKey,
                });
                setNoteDraft(quickOpen.shift.notes ?? '');
                const idx = weekDays.findIndex(
                  (d) =>
                    startOfDay(d.date).getTime() === startOfDay(quickOpen.dayDate).getTime(),
                );
                setEditingShiftId(quickOpen.shift.id);
                setCreateDay(idx >= 0 ? idx : 0);
                setFormStaff(quickOpen.shift.staffNameKey as (typeof STAFF_KEYS)[number]);
                setFormStart(quickOpen.shift.start);
                setFormEnd(quickOpen.shift.end);
                setFormRole(quickOpen.shift.roleKey as (typeof ROLE_KEYS)[number]);
                setFormSection(quickOpen.shift.sectionKey as (typeof SECTION_KEYS)[number]);
                setQuickOpen(null);
                setEditOpen(true);
              }}
            />
            <SheetSecondaryButton
              label={t('staff.scheduleActionAssign')}
              onPress={() => {
                if (!quickOpen) return;
                setAssignOpen({ shift: quickOpen.shift, mondayKey: quickOpen.mondayKey });
                setQuickOpen(null);
              }}
            />
            <SheetSecondaryButton
              label={t('staff.scheduleActionDelete')}
              onPress={() => {
                if (!quickOpen) return;
                setDeleteConfirm({ shiftId: quickOpen.shift.id, mondayKey: quickOpen.mondayKey });
                setQuickOpen(null);
              }}
            />
          </>
        ) : null}
      </ScheduleBottomSheet>

      <ScheduleCenterModal
        visible={deleteConfirm != null}
        onClose={() => setDeleteConfirm(null)}
        title={t('staff.scheduleConfirmDeleteTitle')}
        message={t('staff.scheduleConfirmDeleteBody')}
        actions={
          <>
            <SheetSecondaryButton label={t('common.cancel')} onPress={() => setDeleteConfirm(null)} />
            <SheetPrimaryButton
              label={t('staff.scheduleActionDelete')}
              onPress={() => {
                if (deleteConfirm) deleteShift(deleteConfirm.shiftId);
                setDeleteConfirm(null);
              }}
            />
          </>
        }
      />
    </>
  );
}

const DAY_IDX = [0, 1, 2, 3, 4, 5, 6];

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    width: '100%',
    maxWidth: '100%',
  },
  scrollContent: {
    paddingHorizontal: PAD_H,
    paddingTop: 6,
    flexGrow: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginBottom: SECTION_GAP,
  },
  dividerLight: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginTop: 4,
    marginBottom: 6,
  },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconGhost: {
    width: 36,
    height: 36,
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    backgroundColor: CARD_RAISED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.88 },
  chipScroll: {
    marginBottom: SECTION_GAP,
    flexGrow: 0,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingRight: 16,
  },
  chipPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  chipPrimaryPressed: {
    transform: [{ scale: 0.97 }],
    shadowOpacity: 0.18,
  },
  chipPrimaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: BG,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  chipSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: '#1A1A1A',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipSecondaryPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.96,
  },
  chipSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: GOLD,
    lineHeight: 18,
    letterSpacing: -0.15,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    minHeight: 44,
  },
  weekArrow: {
    width: 40,
    height: 40,
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRange: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: -0.2,
    paddingHorizontal: 8,
  },
  summaryLine: {
    fontSize: 13,
    fontWeight: '500',
    color: TEXT_MUTED,
    marginBottom: SECTION_GAP,
    lineHeight: 18,
  },
  dayList: { gap: 14, width: '100%', paddingBottom: 8 },
  dayCard: {
    borderRadius: 18,
    backgroundColor: CARD,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    padding: 14,
  },
  dayCardEmpty: { backgroundColor: CARD_RAISED, paddingVertical: 12 },
  dayCardToday: {
    borderColor: 'rgba(198, 168, 91, 0.45)',
    shadowColor: GOLD,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  dayHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  dayHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: TEXT_SOFT,
    letterSpacing: 1,
  },
  doubleBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: GOLD,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  hintRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  hintMini: { fontSize: 11, fontWeight: '600', color: TEXT_MUTED },
  noShifts: { fontSize: 14, fontWeight: '500', color: TEXT_SOFT, opacity: 0.85 },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
  },
  shiftRowSplit: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
    marginTop: 4,
    paddingTop: 14,
  },
  shiftRowPressed: { opacity: 0.92 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(198, 168, 91, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(198, 168, 91, 0.35)',
  },
  avatarTxt: { fontSize: 16, fontWeight: '800', color: GOLD },
  shiftBody: { flex: 1, minWidth: 0 },
  shiftTime: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  staffName: { fontSize: 15, fontWeight: '700', color: TEXT },
  shiftRole: { fontSize: 14, fontWeight: '600', color: TEXT_MUTED, marginBottom: 2 },
  shiftLoc: { fontSize: 13, fontWeight: '500', color: TEXT_SOFT, marginBottom: 8 },
  badgeRow: { alignSelf: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badgeScheduled: {
    fontSize: 11,
    fontWeight: '800',
    color: BG,
    backgroundColor: GOLD,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  badgeCompleted: {
    fontSize: 11,
    fontWeight: '800',
    color: TEXT,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  badgeUnder: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
    backgroundColor: '#B91C1C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  badgeConflict: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
    backgroundColor: '#991B1B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: CARD_RAISED,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    maxWidth: '90%',
  },
  toastText: { color: TEXT, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheetOuter: {
    backgroundColor: CARD_RAISED,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  sheetGrab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: BORDER,
    marginBottom: 10,
  },
  sheetKicker: {
    fontSize: 11,
    fontWeight: '800',
    color: GOLD,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sheetDate: { fontSize: 20, fontWeight: '800', color: TEXT, marginBottom: 12 },
  sheetScroll: { maxHeight: screenH * 0.5 },
  sheetDetailBlock: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  sheetTimeBig: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT,
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  sheetName: { fontSize: 16, fontWeight: '800', color: TEXT, marginBottom: 4 },
  sheetLine: { fontSize: 14, fontWeight: '600', color: TEXT_MUTED, marginBottom: 4 },
  sheetMuted: { fontSize: 13, color: TEXT_SOFT, marginBottom: 8 },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_MUTED,
    marginBottom: 6,
    marginTop: 4,
  },
  notesInput: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    color: TEXT,
    padding: 12,
    minHeight: 72,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  sheetActionText: { flex: 1, fontSize: 16, fontWeight: '600', color: TEXT },
  sheetDone: { alignSelf: 'center', paddingVertical: 14 },
  sheetDoneText: { fontSize: 16, fontWeight: '600', color: TEXT_MUTED },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_MUTED,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    color: TEXT,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  dayPick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  dayPickBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  dayPickBtnOn: { borderColor: GOLD, backgroundColor: 'rgba(198, 168, 91, 0.2)' },
  dayPickTxt: { fontSize: 12, fontWeight: '700', color: TEXT_MUTED },
  dayPickTxtOn: { color: GOLD },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  pillOn: { borderColor: GOLD, backgroundColor: 'rgba(198, 168, 91, 0.15)' },
  pillTxt: { fontSize: 13, fontWeight: '600', color: TEXT_MUTED },
  pillTxtOn: { color: GOLD },
  formActions: { gap: 10, marginTop: 16, marginBottom: 8 },
  levelRow: { flexDirection: 'row', gap: 8, marginBottom: 16, justifyContent: 'space-between' },
  levelDot: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  levelDotOn: { borderColor: GOLD, backgroundColor: 'rgba(198, 168, 91, 0.2)' },
  levelDotTxt: { fontSize: 16, fontWeight: '800', color: TEXT_MUTED },
  levelDotTxtOn: { color: GOLD },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 4,
  },
  switchLbl: { fontSize: 15, color: TEXT, flex: 1 },
  weekPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  weekPickRowOn: { backgroundColor: 'rgba(198, 168, 91, 0.08)' },
  weekPickTxt: { fontSize: 15, fontWeight: '600', color: TEXT, flex: 1 },
  weekPickBadge: { fontSize: 12, fontWeight: '800', color: GOLD },
  assignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  assignTxt: { fontSize: 16, fontWeight: '600', color: TEXT },
});
