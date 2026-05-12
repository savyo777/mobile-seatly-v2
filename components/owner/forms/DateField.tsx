import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function toIso(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function fromIso(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildGrid(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(first).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  while (rows[rows.length - 1].length < 7) rows[rows.length - 1].push(null);
  return rows;
}

const useStyles = createStyles((c) => ({
  field: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 4,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted },
  fieldValue: { fontSize: 16, fontWeight: '600', color: c.textPrimary, paddingVertical: 4 },
  fieldEmpty: { color: c.textMuted },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.bgSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  monthBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: c.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  monthTitle: { fontSize: 16, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.2 },

  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  weekText: { fontSize: 11, fontWeight: '700', color: c.textMuted, letterSpacing: 0.5 },

  gridRow: { flexDirection: 'row' },
  dayCell: { flex: 1, aspectRatio: 1, padding: 3 },
  dayInner: {
    flex: 1,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInnerSelected: { backgroundColor: c.gold },
  dayText: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
  dayTextSelected: { color: c.bgBase, fontWeight: '800' },
  dayTextToday: { color: c.gold },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  clearBtn: {
    flex: 1, paddingVertical: 12,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  clearText: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
  doneBtn: {
    flex: 1, paddingVertical: 12,
    borderRadius: borderRadius.full,
    backgroundColor: c.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  doneText: { fontSize: 14, fontWeight: '800', color: c.bgBase },
}));

export interface DateFieldProps {
  label: string;
  value: string | null;     // ISO YYYY-MM-DD
  onChange: (iso: string | null) => void;
  placeholder?: string;
  minIso?: string;
}

export function DateField({ label, value, onChange, placeholder = 'Select a date', minIso }: DateFieldProps) {
  const c = useColors();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const initial = useMemo(() => fromIso(value ?? '') ?? new Date(), [value]);
  const [cursor, setCursor] = useState<Date>(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const [draft, setDraft] = useState<string | null>(value);

  const todayIso = toIso(new Date());
  const grid = buildGrid(cursor.getFullYear(), cursor.getMonth());

  const display = value ? (fromIso(value)?.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  }) ?? value) : '';

  const onOpen = () => {
    setDraft(value);
    const init = fromIso(value ?? '') ?? new Date();
    setCursor(new Date(init.getFullYear(), init.getMonth(), 1));
    setOpen(true);
  };

  return (
    <>
      <Pressable onPress={onOpen} style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={[styles.fieldValue, !value && styles.fieldEmpty]}>
          {display || placeholder}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} style={styles.sheet}>
            <View style={styles.monthRow}>
              <Pressable
                onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                style={styles.monthBtn}
              >
                <Ionicons name="chevron-back" size={18} color={c.textPrimary} />
              </Pressable>
              <Text style={styles.monthTitle}>
                {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
              </Text>
              <Pressable
                onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                style={styles.monthBtn}
              >
                <Ionicons name="chevron-forward" size={18} color={c.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {DAY_LABELS.map((d, i) => (
                <View key={`${d}-${i}`} style={styles.weekCell}>
                  <Text style={styles.weekText}>{d}</Text>
                </View>
              ))}
            </View>

            <ScrollView>
              {grid.map((row, rIdx) => (
                <View key={rIdx} style={styles.gridRow}>
                  {row.map((day, cIdx) => {
                    if (day == null) {
                      return <View key={`${rIdx}-${cIdx}`} style={styles.dayCell} />;
                    }
                    const iso = toIso(new Date(cursor.getFullYear(), cursor.getMonth(), day));
                    const isSelected = iso === draft;
                    const isToday = iso === todayIso;
                    const disabled = minIso ? iso < minIso : false;
                    return (
                      <View key={`${rIdx}-${cIdx}`} style={styles.dayCell}>
                        <Pressable
                          onPress={() => !disabled && setDraft(iso)}
                          style={[
                            styles.dayInner,
                            isSelected && styles.dayInnerSelected,
                            disabled && { opacity: 0.3 },
                          ]}
                        >
                          <Text style={[
                            styles.dayText,
                            isToday && !isSelected && styles.dayTextToday,
                            isSelected && styles.dayTextSelected,
                          ]}>{day}</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                onPress={() => { onChange(null); setOpen(false); }}
                style={styles.clearBtn}
              >
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
              <Pressable
                onPress={() => { onChange(draft); setOpen(false); }}
                style={styles.doneBtn}
              >
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export const DateFieldStyles = StyleSheet.create({}); // placeholder export to satisfy tree-shakers
