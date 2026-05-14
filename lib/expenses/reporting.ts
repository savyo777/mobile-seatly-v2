import type { Expense } from '@/lib/expenses/types';
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategoryKey,
} from '@/lib/owner/expenseCategories';

export type ReportPeriodKey = 'this_month' | 'last_month' | 'this_year' | 'custom';

export interface ReportRange {
  from: string;
  to: string;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function rangeForPeriod(period: ReportPeriodKey, today: Date = new Date()): ReportRange {
  const y = today.getFullYear();
  const m = today.getMonth();
  if (period === 'this_month') {
    return { from: isoDate(new Date(y, m, 1)), to: isoDate(new Date(y, m + 1, 0)) };
  }
  if (period === 'last_month') {
    return { from: isoDate(new Date(y, m - 1, 1)), to: isoDate(new Date(y, m, 0)) };
  }
  // this_year (and custom-default fallback)
  return { from: isoDate(new Date(y, 0, 1)), to: isoDate(new Date(y, 11, 31)) };
}

function inRange(expense: Expense, range: ReportRange): boolean {
  return expense.expenseDate >= range.from && expense.expenseDate <= range.to;
}

export interface ExpenseSummary {
  totalSpend: number;
  totalIncome: number;
  /** netSpend = totalSpend - totalIncome. Positive means money went out
   *  net; negative means more came in than went out for the period. */
  netSpend: number;
  totalTax: number;
  count: number;
  incomeCount: number;
  receiptsAttached: number;
}

export function summarizeExpenses(expenses: Expense[], range: ReportRange): ExpenseSummary {
  let totalSpend = 0;
  let totalIncome = 0;
  let totalTax = 0;
  let count = 0;
  let incomeCount = 0;
  let receiptsAttached = 0;
  for (const e of expenses) {
    if (!inRange(e, range)) continue;
    if (e.transactionType === 'income') {
      totalIncome += e.totalAmount;
      incomeCount += 1;
      continue;
    }
    // transactionType === 'expense' (the column's default).
    totalSpend += e.totalAmount;
    if (e.taxAmount != null) totalTax += e.taxAmount;
    count += 1;
    if (e.receiptUrl) receiptsAttached += 1;
  }
  const net = totalSpend - totalIncome;
  return {
    totalSpend: Math.round(totalSpend * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    netSpend: Math.round(net * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    count,
    incomeCount,
    receiptsAttached,
  };
}

export interface CategoryRollup {
  category: ExpenseCategoryKey;
  label: string;
  glyph: string;
  count: number;
  subtotal: number;
  share: number;
}

function groupByCategory(
  expenses: Expense[],
  range: ReportRange,
  transactionType: 'expense' | 'income',
): CategoryRollup[] {
  const totals = new Map<ExpenseCategoryKey, { count: number; subtotal: number }>();
  let grand = 0;
  for (const e of expenses) {
    if (e.transactionType !== transactionType) continue;
    if (!inRange(e, range)) continue;
    const cur = totals.get(e.category) ?? { count: 0, subtotal: 0 };
    cur.count += 1;
    cur.subtotal += e.totalAmount;
    totals.set(e.category, cur);
    grand += e.totalAmount;
  }
  const out: CategoryRollup[] = [];
  for (const [key, agg] of totals) {
    const cat = EXPENSE_CATEGORIES.find((c) => c.key === key);
    out.push({
      category: key,
      label: cat?.label ?? key,
      glyph: cat?.glyph ?? '·',
      count: agg.count,
      subtotal: Math.round(agg.subtotal * 100) / 100,
      share: grand > 0 ? agg.subtotal / grand : 0,
    });
  }
  out.sort((a, b) => b.subtotal - a.subtotal);
  return out;
}

export function groupExpensesByCategory(
  expenses: Expense[],
  range: ReportRange,
): CategoryRollup[] {
  return groupByCategory(expenses, range, 'expense');
}

export function groupIncomeBySource(
  expenses: Expense[],
  range: ReportRange,
): CategoryRollup[] {
  return groupByCategory(expenses, range, 'income');
}

export interface MonthRollup {
  monthKey: string;
  label: string;
  subtotal: number;
}

const MONTH_LABELS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function groupExpensesByMonth(expenses: Expense[], range: ReportRange): MonthRollup[] {
  // Produce a full month-by-month series for the range so empty months
  // render as zero-height bars (cleaner chart than holes in the sequence).
  const fromM = new Date(`${range.from}T12:00:00`);
  const toM = new Date(`${range.to}T12:00:00`);
  if (Number.isNaN(fromM.getTime()) || Number.isNaN(toM.getTime())) return [];

  const months: MonthRollup[] = [];
  const cursor = new Date(fromM.getFullYear(), fromM.getMonth(), 1);
  const end = new Date(toM.getFullYear(), toM.getMonth(), 1);
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    months.push({
      monthKey: `${y}-${pad(m + 1)}`,
      label: MONTH_LABELS_SHORT[m] + (cursor.getFullYear() !== toM.getFullYear() ? ` '${String(y).slice(2)}` : ''),
      subtotal: 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const e of expenses) {
    if (e.transactionType !== 'expense') continue;
    if (!inRange(e, range)) continue;
    const key = e.expenseDate.slice(0, 7);
    const slot = months.find((mo) => mo.monthKey === key);
    if (slot) slot.subtotal += e.totalAmount;
  }
  for (const m of months) m.subtotal = Math.round(m.subtotal * 100) / 100;
  return months;
}

export function filterExpensesInRange(expenses: Expense[], range: ReportRange): Expense[] {
  return expenses.filter((e) => inRange(e, range));
}
