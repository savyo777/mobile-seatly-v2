import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { GlassCard } from '@/components/owner/GlassCard';
import { MonthCalendar } from '@/components/owner/MonthCalendar';
import { useExpenses } from '@/lib/context/ExpensesContext';
import {
  filterExpensesInRange,
  groupExpensesByCategory,
  groupExpensesByMonth,
  rangeForPeriod,
  summarizeExpenses,
  type ReportPeriodKey,
  type ReportRange,
} from '@/lib/expenses/reporting';
import { shareExpensesCsv } from '@/lib/expenses/exportCsv';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { createStyles } from '@/lib/theme';
import {
  ownerColorsFromPalette,
  ownerRadii,
  ownerSpace,
  useOwnerColors,
} from '@/lib/theme/ownerTheme';
import { brandGold, withAlpha } from '@/lib/theme/tokens';

const PERIODS: Array<{ key: ReportPeriodKey; label: string }> = [
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'this_year', label: 'This year' },
  { key: 'custom', label: 'Custom' },
];

function formatHumanDate(iso: string): string {
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

export default function ExpenseReportsScreen() {
  const router = useRouter();
  const ownerColors = useOwnerColors();
  const styles = useStyles();
  const { expenses } = useExpenses();
  const [period, setPeriod] = useState<ReportPeriodKey>('this_month');
  const [customRange, setCustomRange] = useState<ReportRange>(() => rangeForPeriod('this_year'));
  const [datePicker, setDatePicker] = useState<'from' | 'to' | null>(null);
  const [exporting, setExporting] = useState(false);

  const range = useMemo<ReportRange>(
    () => (period === 'custom' ? customRange : rangeForPeriod(period)),
    [period, customRange],
  );

  const summary = useMemo(() => summarizeExpenses(expenses, range), [expenses, range]);
  const byCategory = useMemo(() => groupExpensesByCategory(expenses, range), [expenses, range]);
  const monthSpan = useMemo(() => {
    const from = new Date(`${range.from}T12:00:00`);
    const to = new Date(`${range.to}T12:00:00`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
    return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1;
  }, [range.from, range.to]);
  const byMonth = useMemo(
    () => (monthSpan > 1 ? groupExpensesByMonth(expenses, range) : []),
    [expenses, range, monthSpan],
  );
  const monthChartMax = useMemo(
    () => byMonth.reduce((max, m) => Math.max(max, m.subtotal), 0),
    [byMonth],
  );

  const handleClose = useCallback(() => router.back(), [router]);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    const inRange = filterExpensesInRange(expenses, range);
    if (inRange.length === 0) {
      Alert.alert('Nothing to export', 'No expenses in the selected period.');
      return;
    }
    setExporting(true);
    try {
      const shared = await shareExpensesCsv(inRange);
      if (!shared) {
        Alert.alert(
          'Sharing unavailable',
          'This device cannot open the share sheet right now.',
        );
      }
    } catch (err) {
      Alert.alert('Export failed', String((err as Error)?.message ?? err));
    } finally {
      setExporting(false);
    }
  }, [exporting, expenses, range]);

  return (
    <View style={styles.screen}>
      <OwnerScreen contentContainerStyle={styles.scrollPad}>
        <Animated.View entering={FadeInDown.duration(220)} style={styles.headRow}>
          <Pressable onPress={handleClose} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={ownerColors.gold} />
          </Pressable>
          <View style={styles.headText}>
            <Text style={styles.title}>Expense reports</Text>
            <Text style={styles.subtitle}>
              {formatHumanDate(range.from)} – {formatHumanDate(range.to)}
            </Text>
          </View>
          <View style={styles.headRight} />
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.periodRow}
          >
            {PERIODS.map((p) => {
              const on = period === p.key;
              return (
                <Pressable
                  key={p.key}
                  onPress={() => setPeriod(p.key)}
                  style={[styles.periodChip, on && styles.periodChipOn]}
                >
                  <Text style={[styles.periodChipText, on && styles.periodChipTextOn]}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {period === 'custom' ? (
            <View style={styles.customRangeRow}>
              <Pressable onPress={() => setDatePicker('from')} style={styles.customDateBtn}>
                <Ionicons name="calendar-outline" size={14} color={ownerColors.gold} />
                <Text style={styles.customDateText}>From {formatHumanDate(customRange.from)}</Text>
              </Pressable>
              <Pressable onPress={() => setDatePicker('to')} style={styles.customDateBtn}>
                <Ionicons name="calendar-outline" size={14} color={ownerColors.gold} />
                <Text style={styles.customDateText}>To {formatHumanDate(customRange.to)}</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.headlineGrid}>
            <HeadlineTile
              label="Total spend"
              value={formatCurrency(summary.totalSpend, 'cad')}
              accent
            />
            <HeadlineTile
              label="Total tax"
              value={formatCurrency(summary.totalTax, 'cad')}
            />
            <HeadlineTile
              label="Receipts"
              value={String(summary.count)}
              subtitle={
                summary.count > 0
                  ? `${summary.receiptsAttached} attached`
                  : 'No expenses yet'
              }
            />
          </View>

          <Text style={styles.sectionLabel}>By category</Text>
          {byCategory.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>
                No expenses in this period. Switch the range above or scan a receipt first.
              </Text>
            </GlassCard>
          ) : (
            <View style={styles.catList}>
              {byCategory.map((row) => (
                <View key={row.category} style={styles.catRow}>
                  <View style={styles.catRowHead}>
                    <Text style={styles.catGlyph}>{row.glyph}</Text>
                    <Text style={styles.catLabel}>{row.label}</Text>
                    <Text style={styles.catCount}>
                      {row.count}{row.count === 1 ? ' receipt' : ' receipts'}
                    </Text>
                    <Text style={styles.catSubtotal}>
                      {formatCurrency(row.subtotal, 'cad')}
                    </Text>
                  </View>
                  <View style={styles.catBarTrack}>
                    <View
                      style={[
                        styles.catBarFill,
                        { width: `${Math.max(2, Math.round(row.share * 100))}%` },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {byMonth.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>By month</Text>
              <GlassCard style={styles.chartCard}>
                <View style={styles.chartRow}>
                  {byMonth.map((m) => {
                    const height = monthChartMax > 0
                      ? Math.max(2, Math.round((m.subtotal / monthChartMax) * 100))
                      : 0;
                    return (
                      <View key={m.monthKey} style={styles.chartCol}>
                        <View style={styles.chartBarTrack}>
                          <View style={[styles.chartBar, { height: `${height}%` }]} />
                        </View>
                        <Text style={styles.chartLabel} numberOfLines={1}>
                          {m.label}
                        </Text>
                        <Text style={styles.chartValue} numberOfLines={1}>
                          {m.subtotal > 0 ? `$${Math.round(m.subtotal)}` : '—'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </GlassCard>
            </>
          ) : null}

          <Pressable
            onPress={handleExport}
            disabled={exporting || summary.count === 0}
            style={({ pressed }) => [
              styles.exportBtn,
              (exporting || summary.count === 0) && styles.exportBtnDisabled,
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Export CSV"
          >
            <Ionicons name="download-outline" size={16} color="#0F0F0F" />
            <Text style={styles.exportBtnText}>
              {exporting ? 'Preparing…' : 'Export CSV'}
            </Text>
          </Pressable>

          <View style={{ height: ownerSpace.xl }} />
        </ScrollView>
      </OwnerScreen>

      <MonthCalendar
        visible={datePicker === 'from'}
        value={customRange.from}
        title="Start date"
        onClose={() => setDatePicker(null)}
        onConfirm={(iso) => {
          setCustomRange((prev) => ({
            from: iso,
            to: prev.to < iso ? iso : prev.to,
          }));
          setDatePicker('to');
        }}
      />
      <MonthCalendar
        visible={datePicker === 'to'}
        value={customRange.to}
        title="End date"
        onClose={() => setDatePicker(null)}
        onConfirm={(iso) => {
          setCustomRange((prev) => ({
            from: prev.from > iso ? iso : prev.from,
            to: iso,
          }));
          setDatePicker(null);
        }}
      />
    </View>
  );
}

function HeadlineTile({
  label,
  value,
  subtitle,
  accent = false,
}: {
  label: string;
  value: string;
  subtitle?: string;
  accent?: boolean;
}) {
  const styles = useStyles();
  return (
    <GlassCard
      style={[styles.headlineTile, accent && styles.headlineTileAccent]}
      variant={accent ? 'secondary' : 'primary'}
    >
      <Text style={styles.headlineLabel}>{label}</Text>
      <Text style={[styles.headlineValue, accent && styles.headlineValueAccent]}>
        {value}
      </Text>
      {subtitle ? <Text style={styles.headlineSub}>{subtitle}</Text> : null}
    </GlassCard>
  );
}

const useStyles = createStyles((c) => {
  const ownerColors = ownerColorsFromPalette(c);
  return {
    screen: { flex: 1 },
    scrollPad: { paddingTop: 2, paddingBottom: ownerSpace.xl },
    headRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: ownerSpace.sm,
      paddingBottom: ownerSpace.md,
    },
    backBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headText: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: ownerColors.text,
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    subtitle: {
      color: ownerColors.textMuted,
      fontSize: 13,
      marginTop: 2,
    },
    headRight: { width: 16 },
    periodRow: {
      gap: 8,
      paddingVertical: 4,
    },
    periodChip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ownerColors.border,
      backgroundColor: ownerColors.bgSurface,
    },
    periodChipOn: {
      borderColor: withAlpha(brandGold.dark, 0.55),
      backgroundColor: withAlpha(brandGold.dark, 0.14),
    },
    periodChipText: {
      color: ownerColors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    periodChipTextOn: {
      color: ownerColors.text,
    },
    customRangeRow: {
      flexDirection: 'row',
      gap: ownerSpace.sm,
      marginTop: ownerSpace.sm,
    },
    customDateBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: ownerRadii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ownerColors.border,
      backgroundColor: ownerColors.bgSurface,
    },
    customDateText: {
      color: ownerColors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    headlineGrid: {
      flexDirection: 'row',
      gap: ownerSpace.sm,
      marginTop: ownerSpace.md,
    },
    headlineTile: {
      flex: 1,
      padding: ownerSpace.md,
      minHeight: 92,
    },
    headlineTileAccent: {
      backgroundColor: withAlpha(brandGold.dark, 0.10),
      borderColor: withAlpha(brandGold.dark, 0.30),
    },
    headlineLabel: {
      color: ownerColors.textMuted,
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      fontWeight: '700',
    },
    headlineValue: {
      color: ownerColors.text,
      fontSize: 22,
      fontWeight: '800',
      marginTop: 6,
      letterSpacing: -0.3,
    },
    headlineValueAccent: {
      color: ownerColors.gold,
    },
    headlineSub: {
      color: ownerColors.textMuted,
      fontSize: 11,
      marginTop: 4,
    },
    sectionLabel: {
      color: ownerColors.text,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginTop: ownerSpace.lg,
      marginBottom: 8,
    },
    emptyCard: {
      padding: ownerSpace.md,
    },
    emptyCardText: {
      color: ownerColors.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
    catList: {
      gap: 10,
    },
    catRow: {
      gap: 6,
      paddingVertical: 6,
    },
    catRowHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    catGlyph: {
      color: ownerColors.gold,
      fontSize: 14,
      width: 16,
      textAlign: 'center',
    },
    catLabel: {
      flex: 1,
      color: ownerColors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    catCount: {
      color: ownerColors.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    catSubtotal: {
      color: ownerColors.text,
      fontSize: 14,
      fontWeight: '700',
      minWidth: 76,
      textAlign: 'right',
    },
    catBarTrack: {
      height: 4,
      borderRadius: 999,
      backgroundColor: ownerColors.bgSurface,
      overflow: 'hidden',
    },
    catBarFill: {
      height: '100%',
      backgroundColor: brandGold.dark,
      borderRadius: 999,
    },
    chartCard: {
      padding: ownerSpace.md,
    },
    chartRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 6,
      height: 160,
    },
    chartCol: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    chartBarTrack: {
      width: '100%',
      flex: 1,
      backgroundColor: 'transparent',
      justifyContent: 'flex-end',
    },
    chartBar: {
      width: '70%',
      alignSelf: 'center',
      backgroundColor: brandGold.dark,
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
      minHeight: 2,
    },
    chartLabel: {
      color: ownerColors.textMuted,
      fontSize: 10,
      fontWeight: '600',
    },
    chartValue: {
      color: ownerColors.text,
      fontSize: 10,
      fontWeight: '700',
    },
    exportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: ownerColors.gold,
      marginTop: ownerSpace.lg,
    },
    exportBtnDisabled: {
      opacity: 0.5,
    },
    exportBtnText: {
      color: '#0F0F0F',
      fontWeight: '800',
      fontSize: 15,
    },
  };
});
