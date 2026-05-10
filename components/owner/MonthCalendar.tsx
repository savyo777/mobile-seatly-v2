import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOwnerColors } from '@/lib/theme/ownerTheme';
import { brandGold, withAlpha } from '@/lib/theme/tokens';

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

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

// 0 = Monday, 6 = Sunday — convert from JS getDay() (0=Sun) to Mon-first index.
function mondayFirstIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

type Props = {
  visible: boolean;
  value: string | null;
  onClose: () => void;
  onConfirm: (iso: string) => void;
  title?: string;
};

export function MonthCalendar({ visible, value, onClose, onConfirm, title = 'Pick a date' }: Props) {
  const ownerColors = useOwnerColors();
  const today = useMemo(() => new Date(), []);
  const initialDate = useMemo(() => parseISODate(value) ?? today, [value, today]);

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [selectedISO, setSelectedISO] = useState<string>(
    value ?? toISODate(today.getFullYear(), today.getMonth(), today.getDate()),
  );

  // When the modal re-opens, reset view to the current value.
  React.useEffect(() => {
    if (visible) {
      const d = parseISODate(value) ?? today;
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setSelectedISO(value ?? toISODate(today.getFullYear(), today.getMonth(), today.getDate()));
    }
  }, [visible, value, today]);

  const grid = useMemo(() => {
    const firstWeekday = mondayFirstIndex(new Date(viewYear, viewMonth, 1).getDay());
    const days = daysInMonth(viewYear, viewMonth);
    const cells: { day: number; iso: string }[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ day: 0, iso: '' });
    for (let d = 1; d <= days; d++) {
      cells.push({ day: d, iso: toISODate(viewYear, viewMonth, d) });
    }
    while (cells.length % 7 !== 0) cells.push({ day: 0, iso: '' });
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: ownerColors.bgSurface, borderColor: ownerColors.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.headerRow}>
            <Pressable onPress={goPrev} hitSlop={8} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={ownerColors.gold} />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[styles.kicker, { color: ownerColors.gold }]}>{title.toUpperCase()}</Text>
              <Text style={[styles.title, { color: ownerColors.text }]}>
                {MONTH_LABELS[viewMonth]} {viewYear}
              </Text>
            </View>
            <Pressable onPress={goNext} hitSlop={8} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={ownerColors.gold} />
            </Pressable>
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
            {grid.map((cell, i) => {
              if (cell.day === 0) {
                return <View key={`e-${i}`} style={styles.cell} />;
              }
              const isSelected = cell.iso === selectedISO;
              const isToday = cell.iso === todayISO;
              return (
                <Pressable
                  key={cell.iso}
                  onPress={() => setSelectedISO(cell.iso)}
                  style={[
                    styles.cell,
                    isSelected && {
                      backgroundColor: brandGold.dark,
                      borderRadius: 999,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.cellText,
                      { color: ownerColors.text },
                      isToday && !isSelected && { color: ownerColors.gold, fontWeight: '800' },
                      isSelected && { color: '#0F0F0F', fontWeight: '800' },
                    ]}
                  >
                    {cell.day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actionsRow}>
            <Pressable onPress={onClose} style={styles.cancelBtn} hitSlop={6}>
              <Text style={[styles.cancelText, { color: ownerColors.textMuted }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(selectedISO)}
              style={[
                styles.confirmBtn,
                { backgroundColor: brandGold.dark },
              ]}
              hitSlop={6}
            >
              <Text style={styles.confirmText}>Use date</Text>
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(brandGold.dark, 0.08),
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '800',
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingBottom: 6,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
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
  },
  cellText: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  confirmText: {
    color: '#0F0F0F',
    fontWeight: '800',
    fontSize: 14,
  },
});
