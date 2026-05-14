import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOwnerColors } from '@/lib/theme/ownerTheme';
import { brandGold, withAlpha } from '@/lib/theme/tokens';

// Google-Calendar-style date picker. Material 3 layout:
//   - Header strip: "SELECT DATE" label, then the formatted selected
//     date in large type (e.g. "Wed, May 14").
//   - Body: a month/year toggle on the left + prev / next chevrons
//     on the right. Tapping the toggle swaps the body between the
//     month-grid view and a year-grid view (Material's behaviour).
//   - Footer: Cancel / OK actions, right-aligned.

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const YEAR_RANGE = 60; // 60 years backwards + 60 forwards in the year picker.

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
function toISODate(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}
function parseISODate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function formatHeaderDate(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

type Cell = {
  day: number;
  iso: string;
  year: number;
  month: number;
  current: boolean;
};

type Props = {
  visible: boolean;
  value: string | null;
  onClose: () => void;
  onConfirm: (iso: string) => void;
  /** Optional. Replaces the "SELECT DATE" header label. */
  title?: string;
};

export function MonthCalendar({ visible, value, onClose, onConfirm, title }: Props) {
  const ownerColors = useOwnerColors();
  const insets = useSafeAreaInsets();
  const today = useMemo(() => new Date(), []);

  const initial = useMemo(() => parseISODate(value) ?? today, [value, today]);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [selectedISO, setSelectedISO] = useState<string>(
    value ?? toISODate(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  const [mode, setMode] = useState<'days' | 'years'>('days');
  const yearListRef = useRef<FlatList<number> | null>(null);

  useEffect(() => {
    if (visible) {
      const d = parseISODate(value) ?? today;
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setSelectedISO(value ?? toISODate(today.getFullYear(), today.getMonth(), today.getDate()));
      setMode('days');
    }
  }, [visible, value, today]);

  const grid = useMemo<Cell[]>(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const cur = daysInMonth(viewYear, viewMonth);
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const prev = daysInMonth(prevYear, prevMonth);
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;

    const cells: Cell[] = [];
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const day = prev - i;
      cells.push({
        day,
        iso: toISODate(prevYear, prevMonth, day),
        year: prevYear,
        month: prevMonth,
        current: false,
      });
    }
    for (let d = 1; d <= cur; d++) {
      cells.push({
        day: d,
        iso: toISODate(viewYear, viewMonth, d),
        year: viewYear,
        month: viewMonth,
        current: true,
      });
    }
    let nd = 1;
    while (cells.length < 42) {
      cells.push({
        day: nd,
        iso: toISODate(nextYear, nextMonth, nd),
        year: nextYear,
        month: nextMonth,
        current: false,
      });
      nd++;
    }
    return cells;
  }, [viewYear, viewMonth]);

  const years = useMemo(() => {
    const base = today.getFullYear();
    const out: number[] = [];
    for (let y = base - YEAR_RANGE; y <= base + YEAR_RANGE; y++) out.push(y);
    return out;
  }, [today]);

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const todayISO = toISODate(today.getFullYear(), today.getMonth(), today.getDate());

  const enterYearMode = () => {
    setMode('years');
    // Scroll to the current view year after the FlatList mounts.
    setTimeout(() => {
      const idx = years.indexOf(viewYear);
      if (idx >= 0 && yearListRef.current) {
        const row = Math.floor(idx / 3);
        yearListRef.current.scrollToOffset({ offset: Math.max(0, row * 56 - 100), animated: false });
      }
    }, 30);
  };

  const pickYear = (y: number) => {
    setViewYear(y);
    setMode('days');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: ownerColors.bgElevated,
              borderColor: ownerColors.border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header strip — selected date display */}
          <View
            style={[
              styles.header,
              { backgroundColor: withAlpha(brandGold.dark, 0.16), borderBottomColor: ownerColors.border },
            ]}
          >
            <Text style={[styles.headerKicker, { color: ownerColors.text }]}>
              {(title ?? 'Select date').toUpperCase()}
            </Text>
            <Text style={[styles.headerDate, { color: ownerColors.text }]} numberOfLines={1}>
              {formatHeaderDate(selectedISO)}
            </Text>
          </View>

          {/* Month / year toggle + chevrons */}
          <View style={styles.navRow}>
            <Pressable
              onPress={() => (mode === 'years' ? setMode('days') : enterYearMode())}
              style={({ pressed }) => [styles.monthToggle, pressed && { opacity: 0.6 }]}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Pick year"
            >
              <Text style={[styles.monthToggleText, { color: ownerColors.text }]}>
                {MONTH_LABELS[viewMonth]} {viewYear}
              </Text>
              <Ionicons
                name={mode === 'years' ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={ownerColors.text}
              />
            </Pressable>

            {mode === 'days' ? (
              <View style={styles.navBtns}>
                <Pressable onPress={goPrev} hitSlop={10} style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.5 }]}>
                  <Ionicons name="chevron-back" size={22} color={ownerColors.text} />
                </Pressable>
                <Pressable onPress={goNext} hitSlop={10} style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.5 }]}>
                  <Ionicons name="chevron-forward" size={22} color={ownerColors.text} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.navBtns} />
            )}
          </View>

          {mode === 'days' ? (
            <>
              <View style={styles.weekdayRow}>
                {WEEKDAY_LABELS.map((w, i) => (
                  <Text key={`w-${i}`} style={[styles.weekday, { color: ownerColors.textMuted }]}>
                    {w}
                  </Text>
                ))}
              </View>

              <View style={styles.grid}>
                {grid.map((cell, idx) => {
                  const isSelected = cell.iso === selectedISO && cell.current;
                  const isToday = cell.iso === todayISO && cell.current;
                  const isOverflow = !cell.current;
                  return (
                    <Pressable
                      key={`${cell.iso}-${idx}`}
                      onPress={() => {
                        if (isOverflow) {
                          setViewYear(cell.year);
                          setViewMonth(cell.month);
                        }
                        setSelectedISO(cell.iso);
                      }}
                      style={styles.cell}
                      accessibilityRole="button"
                      accessibilityLabel={cell.iso}
                    >
                      <View
                        style={[
                          styles.cellInner,
                          isSelected && { backgroundColor: brandGold.dark },
                          isToday && !isSelected && {
                            borderWidth: 1.5,
                            borderColor: brandGold.dark,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.cellText,
                            { color: ownerColors.text },
                            isToday && !isSelected && { color: brandGold.dark, fontWeight: '700' },
                            isSelected && { color: '#0F0F0F', fontWeight: '700' },
                            isOverflow && { color: withAlpha(ownerColors.text, 0.3), fontWeight: '500' },
                          ]}
                        >
                          {cell.day}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <FlatList
              ref={yearListRef}
              data={years}
              numColumns={3}
              keyExtractor={(y) => String(y)}
              style={styles.yearList}
              contentContainerStyle={styles.yearListContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item: y }) => {
                const isView = y === viewYear;
                const isToday = y === today.getFullYear();
                return (
                  <Pressable
                    onPress={() => pickYear(y)}
                    style={({ pressed }) => [
                      styles.yearCell,
                      isView && { backgroundColor: brandGold.dark },
                      pressed && !isView && { opacity: 0.6 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.yearText,
                        { color: ownerColors.text },
                        isToday && !isView && { color: brandGold.dark, fontWeight: '700' },
                        isView && { color: '#0F0F0F', fontWeight: '700' },
                      ]}
                    >
                      {y}
                    </Text>
                  </Pressable>
                );
              }}
            />
          )}

          <View style={[styles.actionsRow, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <Pressable onPress={onClose} hitSlop={8} style={styles.actionBtn}>
              <Text style={[styles.actionTextSecondary, { color: ownerColors.gold }]}>CANCEL</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(selectedISO)}
              hitSlop={8}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="Confirm date"
            >
              <Text style={[styles.actionTextPrimary, { color: ownerColors.gold }]}>OK</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerKicker: {
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '700',
    opacity: 0.7,
  },
  headerDate: {
    marginTop: 8,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  monthToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  monthToggleText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  navBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  cellInner: {
    width: '78%',
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 16,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  yearList: {
    maxHeight: 280,
  },
  yearListContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  yearCell: {
    flex: 1,
    margin: 6,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  yearText: {
    fontSize: 16,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionTextSecondary: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  actionTextPrimary: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
