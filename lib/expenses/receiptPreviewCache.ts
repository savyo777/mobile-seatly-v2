import type { Expense } from '@/lib/expenses/types';

const byExpenseId = new Map<string, string>();
const byReceiptUrl = new Map<string, string>();

export function isDirectReceiptUri(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^(file|content|data|https?):/i.test(value);
}

export function rememberReceiptPreview(
  expenseId: string,
  localUri: string | null | undefined,
  receiptUrl?: string | null,
): void {
  if (!localUri) return;
  byExpenseId.set(expenseId, localUri);
  if (receiptUrl) byReceiptUrl.set(receiptUrl, localUri);
}

export function rememberReceiptStoragePath(
  expenseId: string,
  storagePath: string | null | undefined,
): void {
  const localUri = byExpenseId.get(expenseId);
  if (localUri && storagePath) byReceiptUrl.set(storagePath, localUri);
}

export function getCachedReceiptPreview(expense: Pick<Expense, 'id' | 'receiptUrl'>): string | null {
  return byExpenseId.get(expense.id) ?? (expense.receiptUrl ? byReceiptUrl.get(expense.receiptUrl) ?? null : null);
}
