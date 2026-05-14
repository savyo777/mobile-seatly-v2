import type { Expense } from '@/lib/expenses/types';
import type { ExpenseCategoryKey } from '@/lib/owner/expenseCategories';

export interface ExpenseFilter {
  query: string;
  categories: ExpenseCategoryKey[];
  dateFrom: string | null;
  dateTo: string | null;
  amountMin: number | null;
  amountMax: number | null;
}

export const EMPTY_EXPENSE_FILTER: ExpenseFilter = {
  query: '',
  categories: [],
  dateFrom: null,
  dateTo: null,
  amountMin: null,
  amountMax: null,
};

export function isExpenseFilterActive(filter: ExpenseFilter): boolean {
  return (
    filter.query.trim().length > 0 ||
    filter.categories.length > 0 ||
    filter.dateFrom != null ||
    filter.dateTo != null ||
    filter.amountMin != null ||
    filter.amountMax != null
  );
}

export function applyExpenseFilter(expenses: Expense[], filter: ExpenseFilter): Expense[] {
  const needle = filter.query.trim().toLowerCase();
  const catSet = filter.categories.length > 0 ? new Set(filter.categories) : null;

  return expenses.filter((e) => {
    if (needle) {
      const haystack = [
        e.vendorName ?? '',
        e.receiptNumber ?? '',
        e.notes ?? '',
        e.description ?? '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    if (catSet && !catSet.has(e.category)) return false;
    if (filter.dateFrom && e.expenseDate < filter.dateFrom) return false;
    if (filter.dateTo && e.expenseDate > filter.dateTo) return false;
    if (filter.amountMin != null && e.totalAmount < filter.amountMin) return false;
    if (filter.amountMax != null && e.totalAmount > filter.amountMax) return false;
    return true;
  });
}
