import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { useOwnerTabScrollPadding } from '@/hooks/useOwnerTabScrollPadding';
import {
  OWNER_RESERVATIONS,
  OWNER_FLOOR_TABLES,
  type OwnerReservationSlot,
} from '@/lib/mock/ownerApp';

type DateFilter = 'today' | 'tomorrow' | 'week' | 'custom';

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week', label: 'Week' },
  { key: 'custom', label: 'Custom' },
];

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dateRangeLabel(filter: DateFilter, customDates: string[]): string {
  const today = new Date();
  if (filter === 'today') {
    return today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  }
  if (filter === 'tomorrow') {
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    return t.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  }
  if (filter === 'week') {
    const end = new Date(today);
    end.setDate(end.getDate() + 6);
    const s = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const e = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${s} – ${e}`;
  }
  if (customDates.length === 0) return 'Tap dates to select';
  return [...customDates]
    .sort()
    .map((d) =>
      new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    )
    .join(', ');
}

function buildCalendarGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  if (rows[rows.length - 1].length < 7) {
    while (rows[rows.length - 1].length < 7) rows[rows.length - 1].push(null);
  }
  return rows;
}

const STATUS_SORT_WEIGHT: Record<OwnerReservationSlot['status'], number> = {
  risk: 1,
  pending: 1,
  confirmed: 2,
  seated: 3,
};

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  segmentWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: 3,
  },
  segmentSlot: { flex: 1 },
  segmentBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  segmentBtnActive: { backgroundColor: c.gold },
  segmentLabel: { fontSize: 14, fontWeight: '700', color: c.textMuted },
  segmentLabelActive: { color: c.bgBase },

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
    backgroundColor: c.success,
  },
  kickerText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.8,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -1,
    lineHeight: 38,
  },
  pageSub: {
    fontSize: 14,
    color: c.textMuted,
    fontWeight: '500',
    marginTop: 4,
  },

  rightNowCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.lg,
  },
  rightNowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  rightNowKicker: {
    fontSize: 11,
    fontWeight: '700',
    color: c.gold,
    letterSpacing: 0.8,
  },

  rightNowBig: {
    fontSize: 24,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.md,
  },
  upNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  upNextTimeBlock: { width: 52 },
  upNextClock: {
    fontSize: 22,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  upNextMeridiem: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textMuted,
    marginTop: 2,
  },
  upNextCol: { flex: 1, minWidth: 0 },
  upNextLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  upNextText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },
  seatBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: borderRadius.full,
    backgroundColor: c.gold,
  },
  seatBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000',
  },

  listMeta: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  listMetaText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.6,
  },

  stickyHeader: {
    backgroundColor: c.bgBase,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stickyHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.5,
  },

  bookingCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  bookingCardPressed: { opacity: 0.88, backgroundColor: c.bgElevated },
  statusAccent: { width: 4 },
  bookingInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingRight: spacing.md,
    paddingLeft: spacing.md,
    gap: spacing.md,
    minHeight: 76,
  },
  timeBlock: { width: 52 },
  timeClock: {
    fontSize: 22,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  timeMeridiem: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textMuted,
    marginTop: 2,
  },
  bookingMain: { flex: 1, minWidth: 0 },
  bookingTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  bookingTopLeft: { flex: 1, minWidth: 0 },
  guestName: {
    fontSize: 17,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  metaLine: { fontSize: 13, fontWeight: '500', color: c.textMuted, marginTop: 3 },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 8,
  },
  guestTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  guestTagVip: {
    backgroundColor: `${c.gold}18`,
    borderColor: `${c.gold}44`,
  },
  guestTagText: { fontSize: 10, fontWeight: '700', color: c.textSecondary },
  guestTagVipText: { color: c.gold },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  chevronWrap: { paddingLeft: 2, justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '800', color: c.gold },

  empty: { padding: spacing.xl, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14, color: c.textMuted, textAlign: 'center', fontWeight: '500' },

  summaryCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryTitle: { fontSize: 18, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.3 },
  summarySub: { fontSize: 13, color: c.textMuted, fontWeight: '500', marginTop: 2 },
  summaryStats: { flexDirection: 'row', gap: spacing.md },
  summaryStat: {
    flex: 1,
    backgroundColor: c.bgElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  summaryStatValue: { fontSize: 26, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.5 },
  summaryStatValueAccent: { color: c.gold },
  summaryStatValueDanger: { color: c.danger },
  summaryStatLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted, marginTop: 4 },
  quickRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  quickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, minHeight: 44, borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, backgroundColor: c.bgSurface,
  },
  quickBtnPrimary: { backgroundColor: `${c.gold}16`, borderColor: `${c.gold}55` },
  quickBtnText: { fontSize: 13, fontWeight: '700', color: c.textPrimary },
  quickBtnTextPrimary: { color: c.gold },
  nextRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
  },
  nextAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: c.bgElevated,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  nextCol: { flex: 1, minWidth: 0 },
  nextLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted },
  nextText: { fontSize: 15, fontWeight: '700', color: c.textPrimary, marginTop: 2 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: c.bgSurface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
    maxHeight: '80%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: c.textPrimary,
    marginBottom: spacing.xs,
    letterSpacing: -0.4,
  },
  modalLine: {
    fontSize: 14,
    color: c.textMuted,
    marginBottom: 6,
    fontWeight: '500',
  },
  modalSubtitle: {
    fontSize: 14,
    color: c.textMuted,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  modalSectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  modalKvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  modalKvRowFirst: {
    borderTopWidth: 0,
  },
  modalKvLabel: {
    fontSize: 13,
    color: c.textMuted,
    fontWeight: '600',
    flex: 1,
  },
  modalKvValue: {
    fontSize: 14,
    color: c.textPrimary,
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 1,
  },
  modalNote: {
    fontSize: 13,
    color: c.textPrimary,
    fontWeight: '500',
    lineHeight: 19,
    backgroundColor: c.bgElevated,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    flexWrap: 'wrap',
  },
  modalActionBtn: {
    flexGrow: 1,
    minWidth: '30%',
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    gap: 4,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalActionPrimary: {
    backgroundColor: c.gold,
    borderColor: c.gold,
  },
  modalActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: c.textPrimary,
  },
  modalActionPrimaryText: {
    color: '#FFFFFF',
  },
  modalRiskPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: `${c.danger}1F`,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${c.danger}55`,
    marginBottom: spacing.sm,
  },
  modalRiskText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.danger,
  },
  modalClose: {
    marginTop: spacing.lg,
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  modalCloseText: {
    fontSize: 13,
    fontWeight: '800',
    color: c.textPrimary,
  },

  // Date range label
  dateLabel: {
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  dateLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textMuted,
  },
  dateLabelCustom: { color: c.gold },

  // Calendar modal
  calendarSheet: {
    backgroundColor: c.bgSurface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  calMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  calMonthLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.3,
  },
  calNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  calDowRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  calDowCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  calDowText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.4,
  },
  calRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  calCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  calCellSelected: {
    backgroundColor: c.gold,
  },
  calCellToday: {
    borderWidth: 1.5,
    borderColor: c.gold,
  },
  calCellText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },
  calCellTextSelected: {
    color: c.bgBase,
    fontWeight: '800',
  },
  calCellTextMuted: {
    color: 'transparent',
  },
  calDoneBtn: {
    marginTop: spacing.md,
    paddingVertical: 13,
    borderRadius: borderRadius.lg,
    backgroundColor: c.gold,
    alignItems: 'center',
  },
  calDoneBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000',
  },
  calClearBtn: {
    marginTop: spacing.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  calClearText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textMuted,
  },
}));

function statusPresentation(
  status: OwnerReservationSlot['status'],
  c: ReturnType<typeof useColors>,
): {
  label: string;
  text: string;
  bg: string;
  rail: string;
} {
  switch (status) {
    case 'seated':
      return { label: 'Seated', text: c.info, bg: `${c.info}1F`, rail: c.info };
    case 'risk':
      return { label: 'Booked', text: c.success, bg: `${c.success}1F`, rail: c.success };
    case 'pending':
      return { label: 'Booked', text: c.success, bg: `${c.success}1F`, rail: c.success };
    default:
      return { label: 'Booked', text: c.success, bg: `${c.success}1F`, rail: c.success };
  }
}

function parseMinutes(t: string): number {
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + mins;
}

function hourSectionTitle(human: string): string {
  const m = human.match(/^(\d{1,2}):\d{2}\s*(AM|PM)/i);
  if (!m) return human;
  return `${m[1]} ${m[2].toUpperCase()}`;
}

/** Split "6:00 PM" → big clock + meridiem (Uber-style time column). */
function splitTime(human: string): { clock: string; ap: string } {
  const m = human.match(/^(\d{1,2}:\d{2})\s*(AM|PM)/i);
  if (!m) return { clock: human, ap: '' };
  return { clock: m[1], ap: m[2].toUpperCase() };
}

export default function OwnerReservationsScreen() {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const scrollPad = useOwnerTabScrollPadding();
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customDates, setCustomDates] = useState<string[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState<OwnerReservationSlot | null>(null);

  const todayKey = toDateKey(new Date());

  const dateFiltered = useMemo(() => {
    if (dateFilter === 'today' || dateFilter === 'week') return OWNER_RESERVATIONS;
    if (dateFilter === 'custom') {
      if (customDates.length === 0) return [];
      return OWNER_RESERVATIONS;
    }
    return OWNER_RESERVATIONS.filter((_, i) => i % 2 === 1);
  }, [dateFilter, customDates]);

  const filtered = dateFiltered;

  const glance = useMemo(() => {
    const total = dateFiltered.length;
    const seated = dateFiltered.filter((r) => r.status === 'seated').length;
    const upcoming = dateFiltered.filter(
      (r) => r.status === 'confirmed' || r.status === 'pending' || r.status === 'risk',
    ).length;
    const next = [...dateFiltered]
      .filter((r) => r.status === 'confirmed' || r.status === 'pending' || r.status === 'risk')
      .sort((a, b) => parseMinutes(a.startTime) - parseMinutes(b.startTime))[0];
    return { total, seated, upcoming, next };
  }, [dateFiltered]);

  const capacity = OWNER_FLOOR_TABLES.length;

  const headerSubtitle = useMemo(() => {
    switch (dateFilter) {
      case 'today':
        return 'Tonight — live reservation control';
      case 'tomorrow':
        return 'Tomorrow — plan before service starts';
      default:
        return 'This week — bookings and service flow';
    }
  }, [dateFilter]);

  const summaryHeading = useMemo(() => {
    switch (dateFilter) {
      case 'today':
        return 'Right now';
      case 'tomorrow':
        return 'Tomorrow';
      default:
        return 'This week';
    }
  }, [dateFilter]);

  const sections = useMemo(() => {
    const grouped = new Map<string, { title: string; data: OwnerReservationSlot[] }>();

    [...filtered]
      .sort((a, b) => {
        const timeDiff = parseMinutes(a.startTime) - parseMinutes(b.startTime);
        if (timeDiff !== 0) return timeDiff;
        return STATUS_SORT_WEIGHT[a.status] - STATUS_SORT_WEIGHT[b.status];
      })
      .forEach((row) => {
        const title = hourSectionTitle(row.startTime);
        const existing = grouped.get(title);
        if (existing) {
          existing.data.push(row);
          return;
        }
        grouped.set(title, { title, data: [row] });
      });

    return Array.from(grouped.values());
  }, [filtered]);

  const press = (fn: () => void) => () => {
    Haptics.selectionAsync().catch(() => {});
    fn();
  };

  const onSelectFilter = (key: DateFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setDateFilter(key);
    if (key === 'custom') setCalendarOpen(true);
    else setCustomDates([]);
  };

  const toggleCustomDate = (key: string) => {
    setCustomDates((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key],
    );
  };

  const statusCounts = useMemo(
    () => ({
      all: dateFiltered.length,
      confirmed: dateFiltered.filter((r) => r.status === 'confirmed').length,
      pending: dateFiltered.filter((r) => r.status === 'pending').length,
      seated: dateFiltered.filter((r) => r.status === 'seated').length,
    }),
    [dateFiltered],
  );

  const dayLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
  }, []);

  const minutesUntilNext = useMemo(() => {
    if (dateFilter !== 'today' || !glance.next) return null;
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const diff = parseMinutes(glance.next.startTime) - nowMins;
    return diff > 0 ? diff : null;
  }, [dateFilter, glance.next]);

  return (
    <View style={styles.root}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        ListHeaderComponent={
          <>
            <View style={{ paddingTop: insets.top + spacing.sm }} />

            {/* Page header */}
            <View style={styles.pageHeader}>
              <View style={styles.kickerRow}>
                <View style={styles.kickerDot} />
                <Text style={styles.kickerText}>BOOKINGS · {dayLabel}</Text>
              </View>
              <Text style={styles.pageTitle}>Bookings</Text>
              <Text style={styles.pageSub}>
                {headerSubtitle}
              </Text>
            </View>

            {/* Date segment */}
            <View style={styles.segmentWrap}>
              <View style={styles.segmentTrack} accessibilityRole="tablist">
                {DATE_FILTERS.map((f) => {
                  const active = dateFilter === f.key;
                  return (
                    <View key={f.key} style={styles.segmentSlot}>
                      <Pressable
                        onPress={() => onSelectFilter(f.key)}
                        style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                      >
                        <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                          {f.label}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Date range label */}
            <Pressable
              style={styles.dateLabel}
              onPress={dateFilter === 'custom' ? () => setCalendarOpen(true) : undefined}
            >
              <Text style={[styles.dateLabelText, dateFilter === 'custom' && styles.dateLabelCustom]}>
                {dateRangeLabel(dateFilter, customDates)}
                {dateFilter === 'custom' && '  ›'}
              </Text>
            </Pressable>

            <View style={styles.summaryCard}>
              <Text style={styles.rightNowKicker}>{summaryHeading.toUpperCase()}</Text>
              <Text style={styles.summaryTitle}>
                {dateFiltered.length} reservations
              </Text>
              <Text style={styles.summarySub}>
                {dateFilter === 'today'
                  ? `${glance.seated}/${capacity} currently seated across the floor`
                  : 'Chronological booking board with guest details'}
              </Text>

              <View style={styles.summaryStats}>
                <View style={styles.summaryStat}>
                  <Text style={[styles.summaryStatValue, styles.summaryStatValueAccent]}>
                    {dateFilter === 'today' ? `${glance.seated}/${capacity}` : dateFiltered.length}
                  </Text>
                  <Text style={styles.summaryStatLabel}>
                    {dateFilter === 'today' ? 'Seated now' : 'Reservations'}
                  </Text>
                </View>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryStatValue}>
                    {dateFilter === 'today' ? glance.upcoming : statusCounts.pending}
                  </Text>
                  <Text style={styles.summaryStatLabel}>
                    Upcoming
                  </Text>
                </View>
                <View style={styles.summaryStat}>
                  <Text
                    style={[
                      styles.summaryStatValue,
                      styles.summaryStatValueAccent,
                    ]}
                  >
                    {statusCounts.confirmed}
                  </Text>
                  <Text style={styles.summaryStatLabel}>Booked</Text>
                </View>
              </View>

              {glance.next ? (
                <Pressable
                  style={styles.nextRow}
                  onPress={press(() => setSelected(glance.next!))}
                  accessibilityRole="button"
                >
                  <View style={styles.nextAvatar}>
                    <Text style={styles.avatarText}>{initials(glance.next.guestName)}</Text>
                  </View>
                  <View style={styles.nextCol}>
                    <Text style={styles.nextLabel}>
                      NEXT BOOKING{minutesUntilNext !== null ? ` · IN ${minutesUntilNext} MIN` : ''}
                    </Text>
                    <Text style={styles.nextText} numberOfLines={1}>
                      {glance.next.guestName} · {glance.next.startTime} · Party of {glance.next.partySize}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {filtered.length > 0 ? (
              <View style={styles.listMeta}>
                <Text style={styles.listMetaText}>
                  {filtered.length} BOOKING{filtered.length === 1 ? '' : 'S'} · ORDERED BY TIME
                </Text>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={28} color={c.textMuted} />
            <Text style={styles.emptyText}>No reservations for this view.</Text>
            <Text style={[styles.emptyText, { marginTop: 4, fontSize: 13 }]}>
              {dateFilter === 'custom' ? 'Select dates above to see bookings.' : 'Try Today, Tomorrow, or Week above.'}
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.stickyHeader}>
            <Text style={styles.stickyHeaderText}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item: row }) => {
          const pres = statusPresentation(row.status, c);
          const { clock, ap } = splitTime(row.startTime);
          const tableBit = row.table ? ` · ${row.table}` : '';
          return (
            <Pressable
              onPress={press(() => setSelected(row))}
              style={({ pressed }) => [styles.bookingCard, pressed && styles.bookingCardPressed]}
              accessibilityRole="button"
              accessibilityLabel={`${row.guestName}, ${row.startTime}, ${pres.label}`}
            >
              <View style={[styles.statusAccent, { backgroundColor: pres.rail }]} />
              <View style={styles.bookingInner}>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeClock}>{clock}</Text>
                  {ap ? <Text style={styles.timeMeridiem}>{ap}</Text> : null}
                </View>
                <View style={styles.bookingMain}>
                  <View style={styles.bookingTopRow}>
                    <View style={styles.bookingTopLeft}>
                      <Text style={styles.guestName} numberOfLines={1}>
                        {row.guestName}
                      </Text>
                      <Text style={styles.metaLine} numberOfLines={1}>
                        Party of {row.partySize}{tableBit}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: pres.bg, borderColor: `${pres.text}44` },
                      ]}
                    >
                      <Text style={[styles.statusPillText, { color: pres.text }]}>
                        {pres.label}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.tagRow}>
                    {row.vip ? (
                      <View style={[styles.guestTag, styles.guestTagVip]}>
                        <Text style={[styles.guestTagText, styles.guestTagVipText]}>VIP</Text>
                      </View>
                    ) : null}
                    {row.walkIn ? (
                      <View style={styles.guestTag}>
                        <Text style={styles.guestTagText}>Walk-in</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={styles.chevronWrap}>
                  <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
                </View>
              </View>
            </Pressable>
          );
        }}
        contentContainerStyle={{ paddingBottom: scrollPad }}
        SectionSeparatorComponent={() => null}
      />

      {/* Calendar picker modal */}
      <Modal visible={calendarOpen} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setCalendarOpen(false)}>
          <Pressable style={styles.calendarSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabber} />
            {/* Month nav */}
            <View style={styles.calMonthRow}>
              <Pressable
                style={styles.calNavBtn}
                onPress={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              >
                <Ionicons name="chevron-back" size={18} color={c.textPrimary} />
              </Pressable>
              <Text style={styles.calMonthLabel}>
                {calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <Pressable
                style={styles.calNavBtn}
                onPress={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              >
                <Ionicons name="chevron-forward" size={18} color={c.textPrimary} />
              </Pressable>
            </View>
            {/* Day-of-week headers */}
            <View style={styles.calDowRow}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <View key={i} style={styles.calDowCell}>
                  <Text style={styles.calDowText}>{d}</Text>
                </View>
              ))}
            </View>
            {/* Date grid */}
            {buildCalendarGrid(calMonth.getFullYear(), calMonth.getMonth()).map((row, ri) => (
              <View key={ri} style={styles.calRow}>
                {row.map((day, ci) => {
                  if (day === null) return <View key={ci} style={styles.calCell} />;
                  const key = `${calMonth.getFullYear()}-${String(calMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = customDates.includes(key);
                  const isToday = key === todayKey;
                  return (
                    <Pressable
                      key={ci}
                      style={[styles.calCell, isSelected && styles.calCellSelected, !isSelected && isToday && styles.calCellToday]}
                      onPress={() => toggleCustomDate(key)}
                    >
                      <Text style={[styles.calCellText, isSelected && styles.calCellTextSelected]}>
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
            <Pressable style={styles.calDoneBtn} onPress={() => setCalendarOpen(false)}>
              <Text style={styles.calDoneBtnText}>
                {customDates.length === 0 ? 'Done' : `View ${customDates.length} day${customDates.length === 1 ? '' : 's'}`}
              </Text>
            </Pressable>
            {customDates.length > 0 && (
              <Pressable style={styles.calClearBtn} onPress={() => setCustomDates([])}>
                <Text style={styles.calClearText}>Clear selection</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={selected !== null} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setSelected(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabber} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {selected ? (
                <>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {selected.guestName}
                    {selected.vip ? ' · VIP' : ''}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {selected.startTime} · {selected.partySize} guests
                    {selected.table ? ` · Table ${selected.table}` : ''}
                  </Text>

                  <Text style={styles.modalSectionLabel}>Details</Text>
                  {[
                    { label: 'Status', value: statusPresentation(selected.status, c).label },
                    { label: 'Party size', value: `${selected.partySize} people` },
                    { label: 'Table', value: selected.table ?? 'Not assigned yet' },
                    {
                      label: 'How they booked',
                      value: selected.walkIn ? 'Walk-in / waitlist' : 'Reservation',
                    },
                  ].map((r, i) => (
                    <View
                      key={r.label}
                      style={[styles.modalKvRow, i === 0 && styles.modalKvRowFirst]}
                    >
                      <Text style={styles.modalKvLabel}>{r.label}</Text>
                      <Text style={styles.modalKvValue}>{r.value}</Text>
                    </View>
                  ))}

                  <Text style={styles.modalSectionLabel}>Guest</Text>
                  {[
                    { label: 'Past visits', value: String(selected.pastVisits ?? 0) },
                    { label: 'VIP', value: selected.vip ? 'Yes' : 'No' },
                  ].map((r, i) => (
                    <View
                      key={r.label}
                      style={[styles.modalKvRow, i === 0 && styles.modalKvRowFirst]}
                    >
                      <Text style={styles.modalKvLabel}>{r.label}</Text>
                      <Text style={styles.modalKvValue}>{r.value}</Text>
                    </View>
                  ))}

                  {selected.notes ? (
                    <>
                      <Text style={styles.modalSectionLabel}>Notes</Text>
                      <Text style={styles.modalNote}>{selected.notes}</Text>
                    </>
                  ) : null}

                  <View style={styles.modalActions}>
                    <Pressable style={[styles.modalActionBtn, styles.modalActionPrimary]}>
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      <Text style={[styles.modalActionText, styles.modalActionPrimaryText]}>
                        Seat
                      </Text>
                    </Pressable>
                    <Pressable style={styles.modalActionBtn}>
                      <Ionicons name="chatbubble-outline" size={16} color={c.textPrimary} />
                      <Text style={styles.modalActionText}>Message</Text>
                    </Pressable>
                    <Pressable style={styles.modalActionBtn}>
                      <Ionicons name="close" size={16} color={c.textPrimary} />
                      <Text style={styles.modalActionText}>Cancel</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </ScrollView>
            <Pressable style={styles.modalClose} onPress={() => setSelected(null)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
