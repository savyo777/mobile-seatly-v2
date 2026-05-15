import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MonthCalendar } from '@/components/owner/MonthCalendar';
import {
  EMPTY_EXPENSE_FILTER,
  isExpenseFilterActive,
  type ExpenseFilter,
} from '@/lib/expenses/filter';
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategoryKey,
} from '@/lib/owner/expenseCategories';
import { createStyles } from '@/lib/theme';
import {
  ownerColorsFromPalette,
  ownerRadii,
  ownerSpace,
  useOwnerColors,
} from '@/lib/theme/ownerTheme';
import { brandGold, withAlpha } from '@/lib/theme/tokens';
import { sanitizeMoneyInput, sanitizeSearchInput } from '@/lib/validation/input';

type Props = {
  value: ExpenseFilter;
  onChange: (next: ExpenseFilter) => void;
};

function formatHumanDate(iso: string | null): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.,-]/g, '').replace(',', '.');
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

export function ExpenseFilterBar({ value, onChange }: Props) {
  const ownerColors = useOwnerColors();
  const styles = useStyles();
  const [datePicker, setDatePicker] = useState<'from' | 'to' | null>(null);
  const [amountModalOpen, setAmountModalOpen] = useState(false);
  const [amountMinDraft, setAmountMinDraft] = useState('');
  const [amountMaxDraft, setAmountMaxDraft] = useState('');

  const active = isExpenseFilterActive(value);

  const toggleCategory = useCallback(
    (key: ExpenseCategoryKey) => {
      const has = value.categories.includes(key);
      const next = has
        ? value.categories.filter((k) => k !== key)
        : [...value.categories, key];
      onChange({ ...value, categories: next });
    },
    [value, onChange],
  );

  const clearAll = useCallback(() => onChange(EMPTY_EXPENSE_FILTER), [onChange]);

  const openAmountModal = useCallback(() => {
    setAmountMinDraft(value.amountMin != null ? value.amountMin.toFixed(2) : '');
    setAmountMaxDraft(value.amountMax != null ? value.amountMax.toFixed(2) : '');
    setAmountModalOpen(true);
  }, [value.amountMin, value.amountMax]);

  const commitAmountModal = useCallback(() => {
    onChange({
      ...value,
      amountMin: parseAmount(amountMinDraft),
      amountMax: parseAmount(amountMaxDraft),
    });
    setAmountModalOpen(false);
  }, [amountMinDraft, amountMaxDraft, onChange, value]);

  const dateLabel = useMemo(() => {
    if (!value.dateFrom && !value.dateTo) return 'Any date';
    if (value.dateFrom && value.dateTo) {
      return `${formatHumanDate(value.dateFrom)} → ${formatHumanDate(value.dateTo)}`;
    }
    if (value.dateFrom) return `From ${formatHumanDate(value.dateFrom)}`;
    return `Until ${formatHumanDate(value.dateTo)}`;
  }, [value.dateFrom, value.dateTo]);

  const amountLabel = useMemo(() => {
    if (value.amountMin == null && value.amountMax == null) return 'Any amount';
    const lo = value.amountMin != null ? `$${value.amountMin.toFixed(0)}` : '$0';
    const hi = value.amountMax != null ? `$${value.amountMax.toFixed(0)}` : '∞';
    return `${lo} – ${hi}`;
  }, [value.amountMin, value.amountMax]);

  return (
    <View style={styles.wrap}>
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={ownerColors.textMuted} />
        <TextInput
          value={value.query}
          onChangeText={(q) => onChange({ ...value, query: sanitizeSearchInput(q) })}
          placeholder="Search receipts"
          placeholderTextColor={ownerColors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {value.query ? (
          <Pressable hitSlop={8} onPress={() => onChange({ ...value, query: '' })}>
            <Ionicons name="close-circle" size={16} color={ownerColors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        <Pressable
          onPress={() => setDatePicker('from')}
          style={[styles.pill, (value.dateFrom || value.dateTo) && styles.pillOn]}
        >
          <Ionicons
            name="calendar-outline"
            size={13}
            color={value.dateFrom || value.dateTo ? ownerColors.gold : ownerColors.textMuted}
          />
          <Text
            style={[
              styles.pillText,
              (value.dateFrom || value.dateTo) && styles.pillTextOn,
            ]}
            numberOfLines={1}
          >
            {dateLabel}
          </Text>
        </Pressable>

        <Pressable
          onPress={openAmountModal}
          style={[
            styles.pill,
            (value.amountMin != null || value.amountMax != null) && styles.pillOn,
          ]}
        >
          <Ionicons
            name="cash-outline"
            size={13}
            color={
              value.amountMin != null || value.amountMax != null
                ? ownerColors.gold
                : ownerColors.textMuted
            }
          />
          <Text
            style={[
              styles.pillText,
              (value.amountMin != null || value.amountMax != null) && styles.pillTextOn,
            ]}
          >
            {amountLabel}
          </Text>
        </Pressable>

        {active ? (
          <Pressable onPress={clearAll} style={styles.clearPill} hitSlop={6}>
            <Ionicons name="close" size={13} color={ownerColors.gold} />
            <Text style={styles.clearPillText}>Clear</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
      >
        {EXPENSE_CATEGORIES.map((c) => {
          const on = value.categories.includes(c.key);
          return (
            <Pressable
              key={c.key}
              onPress={() => toggleCategory(c.key)}
              style={[styles.catChip, on && styles.catChipOn]}
            >
              <Text style={[styles.catGlyph, on && styles.catGlyphOn]}>{c.glyph}</Text>
              <Text style={[styles.catChipText, on && styles.catChipTextOn]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <MonthCalendar
        visible={datePicker === 'from'}
        value={value.dateFrom ?? value.dateTo ?? null}
        title="Start date"
        onClose={() => setDatePicker(null)}
        onConfirm={(iso) => {
          const nextTo = value.dateTo && value.dateTo < iso ? null : value.dateTo;
          onChange({ ...value, dateFrom: iso, dateTo: nextTo });
          setDatePicker('to');
        }}
      />
      <MonthCalendar
        visible={datePicker === 'to'}
        value={value.dateTo ?? value.dateFrom ?? null}
        title="End date"
        onClose={() => setDatePicker(null)}
        onConfirm={(iso) => {
          const nextFrom = value.dateFrom && value.dateFrom > iso ? null : value.dateFrom;
          onChange({ ...value, dateTo: iso, dateFrom: nextFrom });
          setDatePicker(null);
        }}
      />

      <Modal
        visible={amountModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAmountModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setAmountModalOpen(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: ownerColors.bgElevated }]}
            onPress={() => {}}
          >
            <Text style={[styles.modalTitle, { color: ownerColors.text }]}>Amount range</Text>
            <Text style={[styles.modalHint, { color: ownerColors.textMuted }]}>
              Match receipts where the total falls in this range.
            </Text>

            <View style={styles.amountGrid}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.amountLabel, { color: ownerColors.text }]}>Min</Text>
                <TextInput
                  value={amountMinDraft}
                  onChangeText={(amount) => setAmountMinDraft(sanitizeMoneyInput(amount))}
                  placeholder="0.00"
                  placeholderTextColor={ownerColors.textMuted}
                  style={styles.amountInput}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.amountLabel, { color: ownerColors.text }]}>Max</Text>
                <TextInput
                  value={amountMaxDraft}
                  onChangeText={(amount) => setAmountMaxDraft(sanitizeMoneyInput(amount))}
                  placeholder="No max"
                  placeholderTextColor={ownerColors.textMuted}
                  style={styles.amountInput}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalSecondary}
                onPress={() => {
                  setAmountMinDraft('');
                  setAmountMaxDraft('');
                  onChange({ ...value, amountMin: null, amountMax: null });
                  setAmountModalOpen(false);
                }}
              >
                <Text style={[styles.modalSecondaryText, { color: ownerColors.text }]}>
                  Clear
                </Text>
              </Pressable>
              <Pressable style={styles.modalPrimary} onPress={commitAmountModal}>
                <Text style={styles.modalPrimaryText}>Apply</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const useStyles = createStyles((c) => {
  const ownerColors = ownerColorsFromPalette(c);
  return {
    wrap: {
      gap: 8,
      marginBottom: ownerSpace.md,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: ownerRadii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ownerColors.border,
      backgroundColor: ownerColors.bgSurface,
    },
    searchInput: {
      flex: 1,
      color: ownerColors.text,
      fontSize: 15,
      padding: 0,
    },
    chipsRow: {
      gap: 8,
      paddingVertical: 2,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ownerColors.border,
      backgroundColor: ownerColors.bgSurface,
      maxWidth: 260,
    },
    pillOn: {
      borderColor: withAlpha(brandGold.dark, 0.55),
      backgroundColor: withAlpha(brandGold.dark, 0.14),
    },
    pillText: {
      color: ownerColors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    pillTextOn: {
      color: ownerColors.text,
    },
    clearPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    clearPillText: {
      color: ownerColors.gold,
      fontSize: 12,
      fontWeight: '700',
    },
    catRow: {
      gap: 8,
      paddingVertical: 2,
    },
    catChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ownerColors.border,
      backgroundColor: ownerColors.bgSurface,
    },
    catChipOn: {
      borderColor: withAlpha(brandGold.dark, 0.55),
      backgroundColor: withAlpha(brandGold.dark, 0.14),
    },
    catGlyph: {
      color: ownerColors.textMuted,
      fontSize: 13,
    },
    catGlyphOn: {
      color: ownerColors.gold,
    },
    catChipText: {
      color: ownerColors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    catChipTextOn: {
      color: ownerColors.text,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalCard: {
      width: '100%',
      borderRadius: 18,
      padding: ownerSpace.lg,
      gap: ownerSpace.md,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    modalHint: {
      fontSize: 13,
      marginTop: -8,
    },
    amountGrid: {
      flexDirection: 'row',
      gap: ownerSpace.sm,
    },
    amountLabel: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    amountInput: {
      backgroundColor: ownerColors.bgSurface,
      borderRadius: ownerRadii.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: ownerColors.text,
      fontSize: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ownerColors.border,
    },
    modalActions: {
      flexDirection: 'row',
      gap: ownerSpace.sm,
      marginTop: 4,
    },
    modalSecondary: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: ownerRadii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ownerColors.border,
      alignItems: 'center',
    },
    modalSecondaryText: {
      fontSize: 15,
      fontWeight: '700',
    },
    modalPrimary: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: ownerRadii.md,
      backgroundColor: ownerColors.gold,
      alignItems: 'center',
    },
    modalPrimaryText: {
      color: '#0F0F0F',
      fontSize: 15,
      fontWeight: '800',
    },
  };
});
