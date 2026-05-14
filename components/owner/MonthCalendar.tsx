import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOwnerColors } from '@/lib/theme/ownerTheme';
import { brandGold, withAlpha } from '@/lib/theme/tokens';

// iOS Calendar–style modal date picker. Slides up as a bottom sheet,
// shows a large month/year header with chevrons on the right, a
// Sunday-first weekday row, a 6-row grid that includes overflow days
// from the surrounding months (dimmed), and a Done / Cancel footer.

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
  /**
   * Accepted but no longer rendered prominently — the iOS-style header
   * shows month + year only. Kept for back-compat with existing call
   * sites that still pass a contextual title.
   */
  title?: string;
};

export function MonthCalendar({ visible, value, onClose, onConfirm }: Props) {
  const ownerColors = useOwnerColors();
  const insets = useSafeAreaInsets();
  const today = useMemo(() => new Date(), []);

  const initial = useMemo(() => parseISODate(value) ?? today, [value, today]);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [selectedISO, setSelectedISO] = useState<string>(
    value ?? toISODate(today.getFullYear(), today.getMonth(), today.getDate()),
  );

  useEffect(() => {
    if (visible) {
      const d = parseISODate(value) ?? today;
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setSelectedISO(value ?? toISODate(today.getFullYear(), today.getMonth(), today.getDate()));
    }
  }, [visible, value, today]);

  const grid = useMemo<Cell[]>(() => {
    // Sunday-first to match iOS US default. JS getDay(): 0 = Sun … 6 = Sat.
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const cur = daysInMonth(viewYear, viewMonth);
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const prev = daysInMonth(prevYear, prevMonth);
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;

    const cells: Cell[] = [];
    // Leading overflow days from previous month.
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
    // Current month.
    for (let d = 1; d <= cur; d++) {
      cells.push({
        day: d,
        iso: toISODate(viewYear, viewMonth, d),
        year: viewYear,
        month: viewMonth,
        current: true,
      });
    }
    // Trailing overflow days to fill 6 rows (42 cells) so the grid height
    // is stable as the month changes.
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: ownerColors.bgElevated,
              borderColor: ownerColors.border,
              paddingBottom: insets.bottom + 18,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.grabber} />

          <View style={styles.headerRow}>
            <Text style={[styles.monthYear, { color: ownerColors.text }]} numberOfLines={1}>
              {MONTH_LABELS[viewMonth]}{' '}
              <Text style={{ color: ownerColors.textMuted }}>{viewYear}</Text>
            </Text>
            <View style={styles.navGroup}>
              <Pressable
                onPress={goPrev}
                hitSlop={10}
                style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.5 }]}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
              >
                <Ionicons name="chevron-back" size={22} color={ownerColors.gold} />
              </Pressable>
              <Pressable
                onPress={goNext}
                hitSlop={10}
                style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.5 }]}
                accessibilityRole="button"
                accessibilityLabel="Next month"
              >
                <Ionicons name="chevron-forward" size={22} color={ownerColors.gold} />
              </Pressable>
            </View>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((w, i) => (
              <Text
                key={`w-${i}`}
                style={[styles.weekday, { color: ownerColors.textMuted }]}
              >
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
                        isOverflow && { color: withAlpha(ownerColors.text, 0.32), fontWeight: '500' },
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actionsRow}>
            <Pressable onPress={onClose} hitSlop={8} style={styles.actionBtn}>
              <Text style={[styles.cancelText, { color: ownerColors.textSecondary }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(selectedISO)}
              hitSlop={8}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="Confirm date"
            >
              <Text style={styles.doneText}>Done</Text>
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
    justifyContent: 'flex-end',
  },
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 6,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  monthYear: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    flex: 1,
    paddingRight: 8,
  },
  navGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingBottom: 6,
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
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  cellInner: {
    width: '76%',
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 17,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 4,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  doneText: {
    color: brandGold.dark,
    fontSize: 16,
    fontWeight: '700',
  },
});
