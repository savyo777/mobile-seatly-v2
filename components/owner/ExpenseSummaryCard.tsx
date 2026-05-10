import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '@/components/owner/GlassCard';
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategoryKey,
} from '@/lib/owner/expenseCategories';
import type { Expense } from '@/lib/expenses/types';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { useOwnerColors } from '@/lib/theme/ownerTheme';
import { brandGold, withAlpha } from '@/lib/theme/tokens';

type Props = {
  expenses: Expense[];
};

interface CategoryTotal {
  key: ExpenseCategoryKey;
  label: string;
  amount: number;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfPrevMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

function inMonth(iso: string, monthStart: Date): boolean {
  const d = new Date(`${iso}T00:00:00`);
  return (
    d.getFullYear() === monthStart.getFullYear() &&
    d.getMonth() === monthStart.getMonth()
  );
}

export function ExpenseSummaryCard({ expenses }: Props) {
  const ownerColors = useOwnerColors();

  const { thisMonthTotal, deltaPercent, currency, topCategories } = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const prevMonthStart = startOfPrevMonth(now);

    let thisMonth = 0;
    let prevMonth = 0;
    const byCategory = new Map<ExpenseCategoryKey, number>();
    const currencyCounts = new Map<string, number>();

    for (const exp of expenses) {
      currencyCounts.set(exp.currency, (currencyCounts.get(exp.currency) ?? 0) + 1);
      if (inMonth(exp.expenseDate, thisMonthStart)) {
        thisMonth += exp.totalAmount;
        byCategory.set(exp.category, (byCategory.get(exp.category) ?? 0) + exp.totalAmount);
      } else if (inMonth(exp.expenseDate, prevMonthStart)) {
        prevMonth += exp.totalAmount;
      }
    }

    const sortedCurrencies = Array.from(currencyCounts.entries()).sort((a, b) => b[1] - a[1]);
    const dominantCurrency = sortedCurrencies[0]?.[0] ?? 'cad';

    const cats: CategoryTotal[] = EXPENSE_CATEGORIES.map((c) => ({
      key: c.key,
      label: c.label,
      amount: byCategory.get(c.key) ?? 0,
    }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    const delta = prevMonth > 0 ? ((thisMonth - prevMonth) / prevMonth) * 100 : null;

    return {
      thisMonthTotal: thisMonth,
      deltaPercent: delta,
      currency: dominantCurrency,
      topCategories: cats,
    };
  }, [expenses]);

  const maxAmount = topCategories[0]?.amount ?? 0;

  return (
    <GlassCard variant="secondary" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.label, { color: ownerColors.textMuted }]}>This month</Text>
          <Text style={[styles.amount, { color: ownerColors.gold }]}>
            {formatCurrency(thisMonthTotal, currency)}
          </Text>
        </View>
        {deltaPercent !== null ? (
          <View
            style={[
              styles.deltaChip,
              {
                borderColor: withAlpha(brandGold.dark, 0.3),
                backgroundColor: withAlpha(brandGold.dark, 0.1),
              },
            ]}
          >
            <Text style={[styles.deltaText, { color: ownerColors.text }]}>
              {deltaPercent >= 0 ? '▲' : '▼'} {Math.abs(deltaPercent).toFixed(1)}%
            </Text>
            <Text style={[styles.deltaLabel, { color: ownerColors.textMuted }]}>vs last</Text>
          </View>
        ) : null}
      </View>

      {topCategories.length > 0 ? (
        <View style={styles.bars}>
          {topCategories.map((c, i) => {
            const widthPercent = maxAmount > 0 ? (c.amount / maxAmount) * 100 : 0;
            const tintAlpha = 0.36 - i * 0.08;
            return (
              <View key={c.key} style={styles.barRow}>
                <Text style={[styles.barLabel, { color: ownerColors.text }]} numberOfLines={1}>
                  {c.label}
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${widthPercent}%`,
                        backgroundColor: withAlpha(brandGold.dark, tintAlpha),
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barAmount, { color: ownerColors.textSecondary }]}>
                  {formatCurrency(c.amount, currency)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={[styles.emptyHint, { color: ownerColors.textMuted }]}>
          No expenses this month yet.
        </Text>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  amount: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  deltaChip: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  deltaText: {
    fontSize: 13,
    fontWeight: '700',
  },
  deltaLabel: {
    fontSize: 10,
    marginTop: 1,
  },
  bars: {
    gap: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barLabel: {
    width: 100,
    fontSize: 12,
    fontWeight: '600',
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  barAmount: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    minWidth: 60,
    textAlign: 'right',
  },
  emptyHint: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});
