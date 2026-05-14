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

  const { thisMonthSpent, thisMonthEarned, deltaPercent, currency, topCategories } = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const prevMonthStart = startOfPrevMonth(now);

    // Track spent (expense rows) and earned (income rows) separately so
    // the card can label them clearly. Mixing them produced a confusing
    // number — e.g. $2000 expense + $4000 income reading as "$6000 this
    // month" with no way to tell the owner whether that's good or bad.
    let thisSpent = 0;
    let thisEarned = 0;
    let prevSpent = 0;
    const byCategory = new Map<ExpenseCategoryKey, number>();
    const currencyCounts = new Map<string, number>();

    for (const exp of expenses) {
      currencyCounts.set(exp.currency, (currencyCounts.get(exp.currency) ?? 0) + 1);
      const isIncome = exp.transactionType === 'income';
      if (inMonth(exp.expenseDate, thisMonthStart)) {
        if (isIncome) {
          thisEarned += exp.totalAmount;
        } else {
          thisSpent += exp.totalAmount;
          byCategory.set(exp.category, (byCategory.get(exp.category) ?? 0) + exp.totalAmount);
        }
      } else if (inMonth(exp.expenseDate, prevMonthStart) && !isIncome) {
        prevSpent += exp.totalAmount;
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

    // Delta compares spend-to-spend; mixing income in would make a
    // good-news month (lots earned) look like a runaway-spend month.
    const delta = prevSpent > 0 ? ((thisSpent - prevSpent) / prevSpent) * 100 : null;

    return {
      thisMonthSpent: thisSpent,
      thisMonthEarned: thisEarned,
      deltaPercent: delta,
      currency: dominantCurrency,
      topCategories: cats,
    };
  }, [expenses]);

  const maxAmount = topCategories[0]?.amount ?? 0;

  const hasActivity = thisMonthSpent > 0 || thisMonthEarned > 0;

  return (
    <GlassCard variant="secondary" style={styles.card}>
      <View style={styles.topRow}>
        <Text style={[styles.label, { color: ownerColors.textMuted }]}>This month</Text>
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
            <Text style={[styles.deltaLabel, { color: ownerColors.textMuted }]}>spend vs last</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.statRow}>
        <View style={[styles.statTile, styles.statTileSpent]}>
          <Text style={styles.statTileLabel}>SPENT</Text>
          <Text
            style={[styles.statTileAmount, styles.statTileAmountSpent]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.55}
          >
            {formatCurrency(thisMonthSpent, currency)}
          </Text>
        </View>
        <View style={[styles.statTile, styles.statTileEarned]}>
          <Text style={styles.statTileLabel}>EARNED</Text>
          <Text
            style={[styles.statTileAmount, styles.statTileAmountEarned]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.55}
          >
            {formatCurrency(thisMonthEarned, currency)}
          </Text>
        </View>
      </View>

      {topCategories.length > 0 ? (
        <View style={styles.bars}>
          <Text style={[styles.barsHeading, { color: ownerColors.textMuted }]}>
            Top spend
          </Text>
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
      ) : !hasActivity ? (
        <Text style={[styles.emptyHint, { color: ownerColors.textMuted }]}>
          No activity this month yet.
        </Text>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontWeight: '700',
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
    fontSize: 12,
    fontWeight: '700',
  },
  deltaLabel: {
    fontSize: 9,
    marginTop: 1,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statTile: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statTileSpent: {
    borderColor: 'rgba(255, 99, 99, 0.32)',
    backgroundColor: 'rgba(255, 99, 99, 0.08)',
  },
  statTileEarned: {
    borderColor: 'rgba(74, 222, 128, 0.42)',
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
  },
  statTileLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
  },
  statTileAmount: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -0.4,
  },
  statTileAmountSpent: {
    color: '#FF7A7A',
  },
  statTileAmountEarned: {
    color: '#4ADE80',
  },
  bars: {
    gap: 8,
  },
  barsHeading: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 2,
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
