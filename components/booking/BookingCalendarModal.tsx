import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { CalendarCell, DateKey } from '@/lib/booking/availabilityTypes';
import { getCalendarMonth, getShiftConfig } from '@/lib/booking/getAvailability';
import { parseDateKeyLocal } from '@/lib/booking/dateUtils';
import { borderRadius, createStyles, spacing } from '@/lib/theme';

const WEEK_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

type Props = {
  visible: boolean;
  restaurantId: string;
  selectedDateKey: DateKey;
  availabilityVersion?: number;
  onClose: () => void;
  onSelect: (key: DateKey) => void;
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function chunkWeeks(cells: CalendarCell[]): CalendarCell[][] {
  const rows: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

const useStyles = createStyles((c) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  sheetWrap: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    maxHeight: '88%',
  },
  blur: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  sheetInner: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
  },
  navRow: {
    flexDirection: 'row',
    gap: 4,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.3 },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  weekLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: '#71717A',
    textAlign: 'center',
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    marginHorizontal: 2,
    maxHeight: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: {
    backgroundColor: c.gold,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: '#CA8A04',
  },
  cellText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  cellTextOutOfMonth: {
    color: '#C0C0C8',
    fontWeight: '400',
  },
  cellTextDisabled: {
    color: '#BABAC0',
    fontWeight: '400',
  },
  cellClosed: {
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  cellTextClosed: {
    color: '#D4D4D8',
    fontWeight: '400',
    textDecorationLine: 'line-through',
  },
  cellTextToday: {
    color: '#CA8A04',
    fontWeight: '700',
  },
  cellTextSelected: { color: '#000', fontWeight: '700' },
  hint: {
    marginTop: spacing.md,
    fontSize: 12,
    color: '#71717A',
    textAlign: 'center',
  },
}));

export function BookingCalendarModal({
  visible,
  restaurantId,
  selectedDateKey,
  availabilityVersion = 0,
  onClose,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const styles = useStyles();
  const config = useMemo(() => getShiftConfig(restaurantId), [restaurantId]);
  const today = useMemo(() => {
    const x = new Date();
    x.setHours(0, 0, 0, 0);
    return x;
  }, []);

  const maxBook = useMemo(() => {
    const x = new Date();
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() + config.advanceBookingDays);
    return x;
  }, [config.advanceBookingDays]);

  const initial = parseDateKeyLocal(selectedDateKey);
  const [cursor, setCursor] = useState(() => ({
    year: initial.getFullYear(),
    monthIndex: initial.getMonth(),
  }));

  useEffect(() => {
    if (!visible) return;
    const d = parseDateKeyLocal(selectedDateKey);
    setCursor({ year: d.getFullYear(), monthIndex: d.getMonth() });
  }, [visible, selectedDateKey]);

  const cells: CalendarCell[] = useMemo(
    () => getCalendarMonth(restaurantId, cursor.year, cursor.monthIndex),
    [restaurantId, cursor.year, cursor.monthIndex, availabilityVersion],
  );

  const weeks = useMemo(() => chunkWeeks(cells), [cells]);

  const monthTitle = new Date(cursor.year, cursor.monthIndex, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const canGoPrev = useMemo(() => {
    const first = startOfMonth(new Date(cursor.year, cursor.monthIndex, 1));
    return first.getTime() > startOfMonth(today).getTime();
  }, [cursor.monthIndex, cursor.year, today]);

  const canGoNext = useMemo(() => {
    const nextFirst = new Date(cursor.year, cursor.monthIndex + 1, 1);
    nextFirst.setHours(0, 0, 0, 0);
    const cap = new Date(maxBook);
    cap.setHours(0, 0, 0, 0);
    return nextFirst.getTime() <= cap.getTime();
  }, [cursor.monthIndex, cursor.year, maxBook]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheetWrap} onPress={(e) => e.stopPropagation()}>
          <BlurView intensity={55} tint="light" style={styles.blur}>
            <View style={styles.sheetInner}>
              <View style={styles.grabber} />
              <View style={styles.headerRow}>
                <View style={styles.monthRow}>
                  <Text style={styles.monthTitle}>{monthTitle}</Text>
                  <Ionicons name="chevron-forward" size={14} color="#CA8A04" />
                </View>
                <View style={styles.navRow}>
                  <Pressable
                    onPress={() =>
                      canGoPrev &&
                      setCursor((c) => ({
                        year: c.monthIndex === 0 ? c.year - 1 : c.year,
                        monthIndex: c.monthIndex === 0 ? 11 : c.monthIndex - 1,
                      }))
                    }
                    hitSlop={12}
                    disabled={!canGoPrev}
                    style={[styles.navBtn, !canGoPrev && styles.navBtnDisabled]}
                  >
                    <Ionicons name="chevron-back" size={20} color={canGoPrev ? '#111' : '#C4C4C8'} />
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      canGoNext &&
                      setCursor((c) => ({
                        year: c.monthIndex === 11 ? c.year + 1 : c.year,
                        monthIndex: c.monthIndex === 11 ? 0 : c.monthIndex + 1,
                      }))
                    }
                    hitSlop={12}
                    disabled={!canGoNext}
                    style={[styles.navBtn, !canGoNext && styles.navBtnDisabled]}
                  >
                    <Ionicons name="chevron-forward" size={20} color={canGoNext ? '#111' : '#C4C4C8'} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.weekRow}>
                {WEEK_LABELS.map((d) => (
                  <Text key={d} style={styles.weekLabel}>
                    {d}
                  </Text>
                ))}
              </View>

              {weeks.map((week, wi) => (
                <View key={wi} style={styles.week}>
                  {week.map((c, di) => {
                    const num = c.dateKey ? parseDateKeyLocal(c.dateKey).getDate() : null;
                    const isSelected = c.dateKey === selectedDateKey;
                    const outOfMonth = !c.inMonth;
                    const disabled = !c.selectable;
                    const closed = c.closedDay && c.inMonth;
                    return (
                      <Pressable
                        key={`${c.dateKey ?? 'x'}-${wi}-${di}`}
                        onPress={() => {
                          if (c.dateKey && c.selectable) {
                            onSelect(c.dateKey);
                            onClose();
                          }
                        }}
                        style={[styles.cell, isSelected && styles.cellSelected, closed && !isSelected && styles.cellClosed, c.isToday && !isSelected && styles.cellToday]}
                      >
                        {num != null ? (
                          <Text
                            style={[
                              styles.cellText,
                              outOfMonth && styles.cellTextOutOfMonth,
                              closed && styles.cellTextClosed,
                              disabled && !closed && styles.cellTextDisabled,
                              c.isToday && !isSelected && styles.cellTextToday,
                              isSelected && styles.cellTextSelected,
                            ]}
                          >
                            {num}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))}

              <Text style={styles.hint}>
                {t('booking.calendarHint')} · <Text style={{ textDecorationLine: 'line-through' }}>Crossed out</Text> = closed
              </Text>
            </View>
          </BlurView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
