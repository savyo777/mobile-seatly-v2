import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { useOwnerTabScrollPadding } from '@/hooks/useOwnerTabScrollPadding';
import {
  OWNER_RESERVATIONS as DEMO_OWNER_RESERVATIONS,
  OWNER_FLOOR_TABLES as DEMO_OWNER_FLOOR_TABLES,
  type OwnerReservationSlot,
} from '@/lib/mock/ownerApp';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { getSupabase } from '@/lib/supabase/client';
import { useOwnerScope } from '@/hooks/useOwnerScope';
import { RestaurantPicker } from '@/components/owner/RestaurantPicker';
import {
  checkInGuest,
  createStaffReservation,
  seatStaffReservation,
  updateStaffReservationStatus,
} from '@/lib/staff/staffServices';
import { subscribeToAvailability } from '@/lib/realtime/availabilityRegistry';

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

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_DISMISS_DRAG_PX = 120;
const SHEET_DISMISS_VELOCITY = 600;

type ReservationDetailSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** The visible-area drag handle: rendered with the pan gesture attached.
   *  Use this for the grabber + title so swiping down on the header dismisses
   *  the sheet without fighting the ScrollView in the body. */
  handle: React.ReactNode;
  children: React.ReactNode;
  sheetStyle: any;
};

/**
 * Bottom sheet that:
 *   - slides up on open with a spring,
 *   - slides down on close with a timed cubic-out,
 *   - dismisses on backdrop press (animated, not abrupt),
 *   - dismisses on swipe down from the handle area (≥120px drag or fast flick).
 *
 * Implemented inline because it's only used in one place; promote to a
 * shared component if a second screen needs the same behaviour.
 */
function ReservationDetailSheet({
  visible,
  onClose,
  handle,
  children,
  sheetStyle,
}: ReservationDetailSheetProps) {
  const [rendered, setRendered] = useState(false);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const finishClose = useCallback(() => {
    setRendered(false);
    onClose();
  }, [onClose]);

  // Mount when asked to be visible. When `visible` flips back to false,
  // play the slide-down before unmounting so the backdrop tap (which sets
  // visible=false externally) animates smoothly instead of cutting.
  useEffect(() => {
    if (visible && !rendered) {
      setRendered(true);
    } else if (!visible && rendered) {
      translateY.value = withTiming(
        SCREEN_HEIGHT,
        { duration: 240, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setRendered)(false);
        },
      );
      backdropOpacity.value = withTiming(0, { duration: 220 });
    }
  }, [visible, rendered, translateY, backdropOpacity]);

  // When we first render, animate in.
  useEffect(() => {
    if (rendered && visible) {
      translateY.value = withSpring(0, { damping: 22, stiffness: 240, mass: 0.9 });
      backdropOpacity.value = withTiming(1, { duration: 220 });
    }
  }, [rendered, visible, translateY, backdropOpacity]);

  const animateOutAndClose = useCallback(() => {
    translateY.value = withTiming(
      SCREEN_HEIGHT,
      { duration: 220, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(finishClose)();
      },
    );
    backdropOpacity.value = withTiming(0, { duration: 200 });
  }, [finishClose, translateY, backdropOpacity]);

  const panGesture = Gesture.Pan()
    // Only activate after a clear downward drag — keeps small taps from
    // hijacking the gesture, and lets nested ScrollView take over for upward
    // scrolls when the handle isn't being dragged.
    .activeOffsetY([15, 9999])
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      const shouldDismiss =
        e.translationY > SHEET_DISMISS_DRAG_PX || e.velocityY > SHEET_DISMISS_VELOCITY;
      if (shouldDismiss) {
        translateY.value = withTiming(
          SCREEN_HEIGHT,
          { duration: 200, easing: Easing.out(Easing.cubic) },
          (finished) => {
            if (finished) runOnJS(finishClose)();
          },
        );
        backdropOpacity.value = withTiming(0, { duration: 180 });
      } else {
        translateY.value = withSpring(0, { damping: 22, stiffness: 240, mass: 0.9 });
      }
    });

  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!rendered) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={animateOutAndClose}>
      <View style={sheetHostStyles.host}>
        <Animated.View
          style={[StyleSheet.absoluteFill, sheetHostStyles.backdrop, backdropAnimStyle]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={animateOutAndClose} />
        </Animated.View>
        <Animated.View style={[sheetStyle, sheetAnimStyle]}>
          <GestureDetector gesture={panGesture}>
            <View>{handle}</View>
          </GestureDetector>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const sheetHostStyles = StyleSheet.create({
  host: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});

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

  pageStickyHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: c.bgBase,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  pageHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
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
  // 64px fits "12:00" / "11:00" at fontSize 22 bold without wrapping mid-
  // character. The old 52px clipped two-digit hours so "11:00" rendered as
  // "11:0\n0" on every booking row. Adjacent column (bookingMain) has
  // flex: 1, so widening here just takes a few pixels off its share.
  timeBlock: { width: 64 },
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

type ReservationExtras = {
  noShowRisk: number | null;
  confirmationCode: string | null;
  depositStatus: string | null;
  source: string | null;
  specialRequest: string | null;
  assignedTableIds: string[];
};

function formatTimeOfDay(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function statusToSlotStatus(raw: string | null | undefined, riskScore: number | null): OwnerReservationSlot['status'] {
  switch ((raw ?? '').toLowerCase()) {
    case 'seated':
      return 'seated';
    case 'pending':
    case 'requested':
      return 'pending';
    default:
      if (riskScore !== null && riskScore > 50) return 'risk';
      return 'confirmed';
  }
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
  const { restaurantIds, selectedRestaurantId, isAll } = useOwnerScope();
  const restaurantId = selectedRestaurantId;
  const restaurantIdsKey = restaurantIds.join('|');
  const [reservations, setReservations] = useState<OwnerReservationSlot[]>(
    isDemoModeEnabled() ? DEMO_OWNER_RESERVATIONS : [],
  );
  const [floorTables] = useState<typeof DEMO_OWNER_FLOOR_TABLES>(
    isDemoModeEnabled() ? DEMO_OWNER_FLOOR_TABLES : [],
  );
  const [reservationExtras, setReservationExtras] = useState<Record<string, ReservationExtras>>({});
  // Track local status overrides so Seat / Cancel feel responsive even though
  // remote updates may take a moment to round-trip.
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, OwnerReservationSlot['status'] | 'cancelled'>
  >({});

  const loadReservations = useCallback(async (ids: string[]) => {
    const supabase = getSupabase();
    if (!supabase || ids.length === 0) {
      setReservations([]);
      setReservationExtras({});
      return;
    }
    const { data, error } = await supabase
      .from('reservations')
      .select(
        'id,guest_id,party_size,reserved_at,status,special_request,no_show_risk_score,confirmation_code,deposit_status,source,guest_full_name,guests:guests(full_name)',
      )
      .in('restaurant_id', ids)
      .order('reserved_at', { ascending: true });
    if (error || !data) return;
    const reservationIds = data.map((row) => String((row as Record<string, unknown>).id ?? '')).filter(Boolean);
    let tableAssignments = new Map<string, string[]>();
    let tableLabelById = new Map<string, string>();
    if (reservationIds.length) {
      const { data: rtRows } = await supabase
        .from('reservation_tables')
        .select('reservation_id,table_id')
        .in('reservation_id', reservationIds);
      const tableIds = new Set<string>();
      (rtRows ?? []).forEach((row) => {
        const rrow = row as Record<string, unknown>;
        const resId = String(rrow.reservation_id ?? '');
        const tableId = String(rrow.table_id ?? '');
        if (!resId || !tableId) return;
        const list = tableAssignments.get(resId) ?? [];
        list.push(tableId);
        tableAssignments.set(resId, list);
        tableIds.add(tableId);
      });
      if (tableIds.size) {
        const { data: tableRows } = await supabase
          .from('tables')
          .select('id,label,table_number')
          .in('id', Array.from(tableIds));
        (tableRows ?? []).forEach((row) => {
          const r = row as Record<string, unknown>;
          const id = String(r.id ?? '');
          const label = (typeof r.label === 'string' && r.label) ||
            (typeof r.table_number === 'string' && r.table_number) ||
            id.slice(0, 4);
          if (id) tableLabelById.set(id, String(label));
        });
      }
    }

    const slots: OwnerReservationSlot[] = [];
    const extras: Record<string, ReservationExtras> = {};
    for (const row of data as Array<Record<string, unknown>>) {
      const id = String(row.id ?? '');
      if (!id) continue;
      const guestObj = Array.isArray(row.guests) ? row.guests[0] : row.guests;
      const guestName =
        (guestObj && typeof guestObj === 'object' &&
          typeof (guestObj as Record<string, unknown>).full_name === 'string'
          ? ((guestObj as Record<string, unknown>).full_name as string)
          : null) ||
        (typeof row.guest_full_name === 'string' ? (row.guest_full_name as string) : null) ||
        'Guest';
      const reservedAt = typeof row.reserved_at === 'string' ? row.reserved_at : '';
      const partySize = typeof row.party_size === 'number' ? row.party_size : Number(row.party_size ?? 0) || 0;
      const risk = typeof row.no_show_risk_score === 'number' ? row.no_show_risk_score : null;
      const assignedIds = tableAssignments.get(id) ?? [];
      const tableLabel = assignedIds.map((tid) => tableLabelById.get(tid) ?? '').filter(Boolean).join(', ') || undefined;
      slots.push({
        id,
        startTime: reservedAt ? formatTimeOfDay(reservedAt) : '—',
        guestName,
        partySize,
        status: statusToSlotStatus(typeof row.status === 'string' ? (row.status as string) : null, risk),
        table: tableLabel,
        walkIn: row.source === 'walkin',
        notes: typeof row.special_request === 'string' ? (row.special_request as string) : undefined,
        vip: false,
      });
      extras[id] = {
        noShowRisk: risk,
        confirmationCode: typeof row.confirmation_code === 'string' ? (row.confirmation_code as string) : null,
        depositStatus: typeof row.deposit_status === 'string' ? (row.deposit_status as string) : null,
        source: typeof row.source === 'string' ? (row.source as string) : null,
        specialRequest: typeof row.special_request === 'string' ? (row.special_request as string) : null,
        assignedTableIds: assignedIds,
      };
    }
    setReservations(slots);
    setReservationExtras(extras);
  }, []);

  useEffect(() => {
    if (isDemoModeEnabled()) return;
    if (restaurantIds.length === 0) return;
    let active = true;
    void (async () => {
      try {
        await loadReservations(restaurantIds);
      } catch {
        // silent — leave empty
      }
      if (!active) return;
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantIdsKey, loadReservations]);

  useEffect(() => {
    if (restaurantIds.length === 0 || isDemoModeEnabled()) return;
    const unsubs = restaurantIds.map((rid) =>
      subscribeToAvailability(rid, () => {
        void loadReservations(restaurantIds);
      }),
    );
    return () => {
      unsubs.forEach((unsub) => {
        if (typeof unsub === 'function') unsub();
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantIdsKey, loadReservations]);

  const handleSeatGuest = useCallback((res: OwnerReservationSlot) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setStatusOverrides((prev) => ({ ...prev, [res.id]: 'seated' }));
    setSelected(null);
    if (!isDemoModeEnabled()) {
      const extras = reservationExtras[res.id];
      const tableId = extras?.assignedTableIds[0];
      void (async () => {
        if (tableId) {
          await seatStaffReservation({ reservationId: res.id, tableId });
        } else {
          await updateStaffReservationStatus({ reservationId: res.id, status: 'seated' });
        }
        if (restaurantIds.length) await loadReservations(restaurantIds);
      })();
    }
    Alert.alert('Seated', `${res.guestName} marked as seated.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationExtras, restaurantIdsKey, loadReservations]);

  const handleCheckIn = useCallback((res: OwnerReservationSlot) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setStatusOverrides((prev) => ({ ...prev, [res.id]: 'confirmed' }));
    if (!isDemoModeEnabled()) {
      void (async () => {
        await checkInGuest({ reservationId: res.id, restaurantId: restaurantId ?? undefined });
        if (restaurantIds.length) await loadReservations(restaurantIds);
      })();
    }
    Alert.alert('Checked in', `${res.guestName} marked as arrived.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, restaurantIdsKey, loadReservations]);

  const handleAddReservation = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    if (isAll) {
      Alert.alert(
        'Pick a restaurant',
        'Switch out of "All restaurants" mode to add a new reservation to a specific location.',
      );
      return;
    }
    if (!restaurantId) {
      Alert.alert('Not ready', 'Restaurant not loaded yet.');
      return;
    }
    if (isDemoModeEnabled()) {
      Alert.alert('Add reservation', 'Demo mode — switch demo off to create real reservations.');
      return;
    }
    Alert.prompt?.(
      'New reservation',
      'Guest name?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Next',
          onPress: (guestName?: string) => {
            if (!guestName) return;
            Alert.prompt?.(
              'Party size',
              'Number of guests',
              (sizeStr?: string) => {
                const partySize = parseInt(sizeStr ?? '', 10);
                if (!partySize || partySize < 1) return;
                const reservedAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
                void (async () => {
                  const res = await createStaffReservation({
                    restaurantId,
                    guestName,
                    partySize,
                    reservedAt,
                  });
                  if (res.error) {
                    Alert.alert('Could not create', res.error);
                  } else {
                    await loadReservations(restaurantIds);
                  }
                })();
              },
              'plain-text',
              '',
              'number-pad',
            );
          },
        },
      ],
      'plain-text',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, restaurantIdsKey, loadReservations]);

  const handleNoShow = useCallback((res: OwnerReservationSlot) => {
    Haptics.selectionAsync().catch(() => {});
    setStatusOverrides((prev) => ({ ...prev, [res.id]: 'cancelled' }));
    setSelected(null);
    if (!isDemoModeEnabled()) {
      void (async () => {
        await updateStaffReservationStatus({ reservationId: res.id, status: 'no_show' });
        if (restaurantIds.length) await loadReservations(restaurantIds);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantIdsKey, loadReservations]);

  const handleMessageGuest = useCallback((res: OwnerReservationSlot) => {
    Haptics.selectionAsync().catch(() => {});
    Alert.alert(
      `Message ${res.guestName}`,
      'Choose how to reach the guest.',
      [
        {
          text: 'Send a reminder',
          onPress: () =>
            Alert.alert(
              'Reminder sent',
              `A booking reminder was sent to ${res.guestName}.`,
            ),
        },
        {
          text: 'Send "Table is ready"',
          onPress: () =>
            Alert.alert(
              'Message sent',
              `${res.guestName} was notified that their table is ready.`,
            ),
        },
        { text: 'Close', style: 'cancel' },
      ],
    );
  }, []);

  const handleCancelReservation = useCallback((res: OwnerReservationSlot) => {
    Haptics.selectionAsync().catch(() => {});
    Alert.alert(
      'Cancel reservation?',
      `This will cancel ${res.guestName}'s booking for ${res.partySize} at ${res.startTime}.`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: () => {
            setStatusOverrides((prev) => ({ ...prev, [res.id]: 'cancelled' }));
            setSelected(null);
            if (!isDemoModeEnabled()) {
              void (async () => {
                await updateStaffReservationStatus({ reservationId: res.id, status: 'cancelled' });
                if (restaurantIds.length) await loadReservations(restaurantIds);
              })();
            }
            Alert.alert('Cancelled', `${res.guestName}'s reservation was cancelled.`);
          },
        },
      ],
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantIdsKey, loadReservations]);

  const todayKey = toDateKey(new Date());

  const dateFiltered = useMemo(() => {
    const base = (() => {
      if (dateFilter === 'today' || dateFilter === 'week') return reservations;
      if (dateFilter === 'custom') {
        if (customDates.length === 0) return [];
        return reservations;
      }
      return reservations.filter((_, i) => i % 2 === 1);
    })();
    // Apply local Seat / Cancel overrides from the modal so the list reflects
    // the action immediately. Cancelled reservations drop out of the list.
    return base.flatMap((r) => {
      const override = statusOverrides[r.id];
      if (override === 'cancelled') return [];
      if (override) return [{ ...r, status: override as OwnerReservationSlot['status'] }];
      return [r];
    });
  }, [dateFilter, customDates, statusOverrides, reservations]);

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

  const capacity = floorTables.length;

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
      {/* Sticky page header */}
      <View style={[styles.pageStickyHeader, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.kickerRow}>
          <View style={styles.kickerDot} />
          <Text style={styles.kickerText}>BOOKINGS · {dayLabel}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.pageTitle}>Bookings</Text>
          <Pressable
            onPress={handleAddReservation}
            accessibilityRole="button"
            accessibilityLabel="Add reservation"
            style={({ pressed }) => [
              {
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: borderRadius.full,
                backgroundColor: c.gold,
                opacity: pressed ? 0.85 : 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              },
            ]}
          >
            <Ionicons name="add" size={16} color="#000" />
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#000' }}>Add</Text>
          </Pressable>
        </View>
        <View style={{ marginTop: spacing.sm }}>
          <RestaurantPicker allowAll size="compact" />
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        ListHeaderComponent={
          <>
            <View style={styles.pageHeader}>
              <Text style={styles.pageSub}>{headerSubtitle}</Text>
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
                  <Text style={styles.timeClock} numberOfLines={1}>{clock}</Text>
                  {ap ? <Text style={styles.timeMeridiem} numberOfLines={1}>{ap}</Text> : null}
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
                    {(() => {
                      const ex = reservationExtras[row.id];
                      const risk = ex?.noShowRisk ?? null;
                      if (risk !== null && risk > 50) {
                        return (
                          <View
                            style={[
                              styles.guestTag,
                              { borderColor: `${c.danger}55`, backgroundColor: `${c.danger}1F` },
                            ]}
                          >
                            <Text style={[styles.guestTagText, { color: c.danger }]}>
                              RISK {risk}
                            </Text>
                          </View>
                        );
                      }
                      return null;
                    })()}
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

      <ReservationDetailSheet
        visible={selected !== null}
        onClose={() => setSelected(null)}
        sheetStyle={styles.modalSheet}
        handle={
          <>
            <View style={styles.grabber} />
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
              </>
            ) : null}
          </>
        }
      >
          <ScrollView showsVerticalScrollIndicator={false}>
            {selected ? (
              <>
                  {(() => {
                    const ex = reservationExtras[selected.id];
                    const risk = ex?.noShowRisk ?? null;
                    if (risk !== null && risk > 50) {
                      return (
                        <View style={styles.modalRiskPill}>
                          <Ionicons name="warning-outline" size={14} color={c.danger} />
                          <Text style={styles.modalRiskText}>No-show risk · {risk}</Text>
                        </View>
                      );
                    }
                    return null;
                  })()}

                  <Text style={styles.modalSectionLabel}>Details</Text>
                  {(() => {
                    const ex = reservationExtras[selected.id];
                    const rows = [
                      { label: 'Status', value: statusPresentation(selected.status, c).label },
                      { label: 'Party size', value: `${selected.partySize} people` },
                      { label: 'Table', value: selected.table ?? 'Not assigned yet' },
                      {
                        label: 'How they booked',
                        value: selected.walkIn ? 'Walk-in / waitlist' : 'Reservation',
                      },
                    ];
                    if (ex?.confirmationCode) {
                      rows.push({ label: 'Code', value: ex.confirmationCode });
                    }
                    if (ex?.depositStatus) {
                      rows.push({ label: 'Deposit', value: ex.depositStatus });
                    }
                    if (ex?.source && !selected.walkIn) {
                      rows.push({ label: 'Source', value: ex.source });
                    }
                    return rows;
                  })().map((r, i) => (
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
                    <Pressable
                      style={({ pressed }) => [
                        styles.modalActionBtn,
                        styles.modalActionPrimary,
                        pressed && { opacity: 0.85 },
                      ]}
                      onPress={() => handleSeatGuest(selected)}
                      accessibilityRole="button"
                      accessibilityLabel={`Seat ${selected.guestName}`}
                    >
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      <Text style={[styles.modalActionText, styles.modalActionPrimaryText]}>
                        Seat
                      </Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.modalActionBtn,
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => handleCheckIn(selected)}
                      accessibilityRole="button"
                      accessibilityLabel={`Check in ${selected.guestName}`}
                    >
                      <Ionicons name="enter-outline" size={16} color={c.textPrimary} />
                      <Text style={styles.modalActionText}>Check in</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.modalActionBtn,
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => handleMessageGuest(selected)}
                      accessibilityRole="button"
                      accessibilityLabel={`Message ${selected.guestName}`}
                    >
                      <Ionicons name="chatbubble-outline" size={16} color={c.textPrimary} />
                      <Text style={styles.modalActionText}>Message</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.modalActionBtn,
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => handleNoShow(selected)}
                      accessibilityRole="button"
                      accessibilityLabel={`Mark ${selected.guestName} as no-show`}
                    >
                      <Ionicons name="alert-circle-outline" size={16} color={c.textPrimary} />
                      <Text style={styles.modalActionText}>No-show</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.modalActionBtn,
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => handleCancelReservation(selected)}
                      accessibilityRole="button"
                      accessibilityLabel={`Cancel ${selected.guestName}'s reservation`}
                    >
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
      </ReservationDetailSheet>
    </View>
  );
}
