import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { RestaurantPicker } from '@/components/owner/RestaurantPicker';
import { useOwnerScope } from '@/hooks/useOwnerScope';
import {
  readClosures,
  writeClosures,
  type ClosureEntry,
} from '@/lib/owner/closuresSettings';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

type Closure = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  reason: string;
};

function entriesToClosures(entries: ClosureEntry[]): Closure[] {
  return entries.map((entry) => ({
    id: `c-${entry.date}`,
    date: entry.date,
    reason: entry.reason?.trim() || 'Closed',
  }));
}

function closuresToEntries(closures: Closure[]): ClosureEntry[] {
  return closures.map((c) => ({
    date: c.date,
    reason: c.reason || null,
  }));
}

function todayKey(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const useStyles = createStyles((c) => ({
  pickerRow: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  savingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  savingText: {
    ...typography.bodySmall,
    color: c.textMuted,
    fontWeight: '600',
  },
  scopeCta: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    marginBottom: spacing.lg,
  },
  scopeCtaText: {
    ...typography.body,
    color: c.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingWrap: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
  },
  intro: {
    paddingHorizontal: 4,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  introTitle: { ...typography.h2, color: c.textPrimary },
  introText: { ...typography.body, color: c.textMuted, lineHeight: 22 },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: c.gold,
    backgroundColor: 'rgba(201,168,76,0.08)',
    marginBottom: spacing.lg,
  },
  addBtnPressed: { opacity: 0.7 },
  addBtnText: {
    ...typography.body,
    color: c.gold,
    fontWeight: '700',
  },

  card: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  closureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 64,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  closureIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.22)',
  },
  closureText: { flex: 1, gap: 2 },
  closureDate: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  closureReason: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 16,
  },
  removeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  empty: {
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    marginBottom: spacing.lg,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  emptyTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  emptyText: {
    ...typography.bodySmall,
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },

  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    backgroundColor: 'rgba(201,168,76,0.06)',
    marginBottom: spacing.lg,
  },
  noteText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 18,
    flex: 1,
  },

  /* Modal — calendar + reason */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: c.bgSurface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  modalGrabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
  },
  modalTitle: {
    ...typography.h2,
    color: c.textPrimary,
  },

  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  calMonthLabel: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  calDowRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  calDowCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  calDowText: {
    ...typography.bodySmall,
    color: c.textMuted,
    fontWeight: '700',
  },
  calRow: { flexDirection: 'row', marginBottom: 4 },
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
    ...typography.body,
    color: c.textPrimary,
  },
  calCellTextSelected: {
    color: c.bgBase,
    fontWeight: '800',
  },
  calCellPast: { opacity: 0.3 },

  reasonInput: {
    ...typography.body,
    color: c.textPrimary,
    backgroundColor: c.bgElevated,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: c.bgElevated,
  },
  modalCancelText: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  modalSave: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: c.gold,
  },
  modalSaveText: {
    ...typography.body,
    color: c.bgBase,
    fontWeight: '800',
  },
  modalSaveDisabled: {
    backgroundColor: c.bgElevated,
  },
  modalSaveTextDisabled: {
    color: c.textMuted,
  },
}));

export default function ClosuresScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const { selectedRestaurantId, isAll, isLoading: scopeLoading } = useOwnerScope();

  const [closures, setClosures] = useState<Closure[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  // Track the latest hydrated restaurant so out-of-order responses don't
  // overwrite a newer load.
  const loadIdRef = useRef(0);

  useEffect(() => {
    if (isAll || !selectedRestaurantId) {
      setClosures([]);
      setIsLoading(false);
      return;
    }
    const myId = ++loadIdRef.current;
    setIsLoading(true);
    void readClosures(selectedRestaurantId)
      .then((entries) => {
        if (loadIdRef.current !== myId) return;
        setClosures(entriesToClosures(entries));
      })
      .catch(() => {
        if (loadIdRef.current !== myId) return;
        setClosures([]);
      })
      .finally(() => {
        if (loadIdRef.current !== myId) return;
        setIsLoading(false);
      });
  }, [selectedRestaurantId, isAll]);

  const persist = useCallback(
    async (next: Closure[]) => {
      if (!selectedRestaurantId || isAll) return;
      setIsSaving(true);
      try {
        await writeClosures(selectedRestaurantId, closuresToEntries(next));
      } catch {
        // Swallow — UI already reflects the optimistic update. A subsequent
        // mount will re-read the source of truth.
      } finally {
        setIsSaving(false);
      }
    },
    [selectedRestaurantId, isAll],
  );

  const sorted = useMemo(
    () => [...closures].sort((a, b) => a.date.localeCompare(b.date)),
    [closures],
  );

  const monthGrid = useMemo(
    () => buildCalendarGrid(calMonth.getFullYear(), calMonth.getMonth()),
    [calMonth],
  );
  const monthLabel = calMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const today = todayKey();

  const openPicker = () => {
    setSelectedKey(null);
    setReason('');
    const d = new Date();
    setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setPickerOpen(true);
  };

  const saveClosure = () => {
    if (!selectedKey) return;
    const id = `c${Date.now()}`;
    const next = [
      ...closures.filter((c) => c.date !== selectedKey),
      { id, date: selectedKey, reason: reason.trim() || 'Closed' },
    ];
    setClosures(next);
    setPickerOpen(false);
    void persist(next);
  };

  const removeClosure = (id: string) => {
    const next = closures.filter((c) => c.id !== id);
    setClosures(next);
    void persist(next);
  };

  const goPrevMonth = () =>
    setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const goNextMonth = () =>
    setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const interactionsDisabled = isSaving || isLoading;

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title="Holidays & closures"
          accentBack
        />
      }
    >
      <View style={styles.pickerRow}>
        <RestaurantPicker allowAll={false} size="compact" />
        {isSaving ? (
          <View style={styles.savingPill}>
            <ActivityIndicator size="small" color={c.gold} />
            <Text style={styles.savingText}>Saving…</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.intro}>
        <Text style={styles.introTitle}>Days you'll be closed</Text>
        <Text style={styles.introText}>
          Block off holidays and one-off closures so guests can't book those days.
        </Text>
      </View>

      {isAll ? (
        <View style={styles.scopeCta}>
          <Ionicons name="storefront-outline" size={28} color={c.gold} />
          <Text style={styles.scopeCtaText}>Pick a restaurant to manage closures</Text>
          <RestaurantPicker allowAll={false} size="full" />
        </View>
      ) : isLoading || scopeLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={c.gold} />
        </View>
      ) : (
        <>
          <Pressable
            onPress={openPicker}
            disabled={interactionsDisabled}
            style={({ pressed }) => [
              styles.addBtn,
              pressed && styles.addBtnPressed,
              interactionsDisabled && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add closure"
          >
            <Ionicons name="add" size={18} color={c.gold} />
            <Text style={styles.addBtnText}>Add a closure</Text>
          </Pressable>

          {sorted.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="calendar-outline" size={26} color={c.gold} />
              </View>
              <Text style={styles.emptyTitle}>No closures scheduled</Text>
              <Text style={styles.emptyText}>
                Tap "Add a closure" to block off a holiday or a day you'll be away.
              </Text>
            </View>
          ) : (
            <View style={styles.card}>
              {sorted.map((c, i) => (
                <View key={c.id} style={[styles.closureRow, i > 0 && styles.rowDivider]}>
                  <View style={styles.closureIcon}>
                    <Ionicons name="ban-outline" size={18} color="#EF4444" />
                  </View>
                  <View style={styles.closureText}>
                    <Text style={styles.closureDate}>{formatDate(c.date)}</Text>
                    <Text style={styles.closureReason}>{c.reason}</Text>
                  </View>
                  <Pressable
                    onPress={() => removeClosure(c.id)}
                    disabled={interactionsDisabled}
                    style={({ pressed }) => [
                      styles.removeBtn,
                      pressed && { opacity: 0.6 },
                      interactionsDisabled && { opacity: 0.5 },
                    ]}
                    hitSlop={8}
                    accessibilityLabel={`Remove ${formatDate(c.date)}`}
                  >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <View style={styles.noteRow}>
        <Ionicons name="information-circle-outline" size={18} color={c.gold} />
        <Text style={styles.noteText}>
          Existing reservations on a closed day stay booked — contact those guests directly to reschedule.
        </Text>
      </View>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalGrabber} />
            <Text style={styles.modalTitle}>Add a closure</Text>

            <View style={styles.calendarHeader}>
              <Pressable
                onPress={goPrevMonth}
                style={({ pressed }) => [styles.calNavBtn, pressed && { opacity: 0.6 }]}
                accessibilityLabel="Previous month"
              >
                <Ionicons name="chevron-back" size={18} color={c.textPrimary} />
              </Pressable>
              <Text style={styles.calMonthLabel}>{monthLabel}</Text>
              <Pressable
                onPress={goNextMonth}
                style={({ pressed }) => [styles.calNavBtn, pressed && { opacity: 0.6 }]}
                accessibilityLabel="Next month"
              >
                <Ionicons name="chevron-forward" size={18} color={c.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.calDowRow}>
              {DAYS_SHORT.map((d, i) => (
                <View key={`${d}-${i}`} style={styles.calDowCell}>
                  <Text style={styles.calDowText}>{d}</Text>
                </View>
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {monthGrid.map((row, ri) => (
                <View key={ri} style={styles.calRow}>
                  {row.map((day, ci) => {
                    if (day === null) return <View key={ci} style={styles.calCell} />;
                    const key = `${calMonth.getFullYear()}-${String(calMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isPast = key < today;
                    const isToday = key === today;
                    const isSelected = key === selectedKey;
                    return (
                      <Pressable
                        key={ci}
                        onPress={() => !isPast && setSelectedKey(key)}
                        disabled={isPast}
                        style={[
                          styles.calCell,
                          isSelected && styles.calCellSelected,
                          !isSelected && isToday && styles.calCellToday,
                          isPast && styles.calCellPast,
                        ]}
                      >
                        <Text
                          style={[
                            styles.calCellText,
                            isSelected && styles.calCellTextSelected,
                          ]}
                        >
                          {day}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Reason (e.g. Christmas Day, staff training)"
              placeholderTextColor={c.textMuted}
              style={styles.reasonInput}
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setPickerOpen(false)}
                style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveClosure}
                disabled={!selectedKey || isSaving}
                style={({ pressed }) => [
                  styles.modalSave,
                  (!selectedKey || isSaving) && styles.modalSaveDisabled,
                  pressed && selectedKey && !isSaving && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={[
                    styles.modalSaveText,
                    (!selectedKey || isSaving) && styles.modalSaveTextDisabled,
                  ]}
                >
                  Save
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </OwnerScreen>
  );
}
