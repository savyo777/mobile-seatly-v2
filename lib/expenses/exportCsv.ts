import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import type { Expense } from '@/lib/expenses/types';

const CSV_HEADER = [
  'date',
  'vendor',
  'category',
  'subtotal',
  'tax',
  'total',
  'currency',
  'payment_method',
  'receipt_number',
  'payment_status',
  'notes',
];

function escapeCell(value: string | number | null | undefined): string {
  if (value == null) return '';
  const s = typeof value === 'number' ? String(value) : value;
  const needsQuoting = /[",\n\r]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
}

export function buildExpensesCsv(expenses: Expense[]): string {
  const lines = [CSV_HEADER.join(',')];
  for (const e of expenses) {
    lines.push(
      [
        e.expenseDate,
        e.vendorName ?? '',
        e.category,
        e.amount.toFixed(2),
        e.taxAmount != null ? e.taxAmount.toFixed(2) : '',
        e.totalAmount.toFixed(2),
        (e.currency ?? '').toUpperCase(),
        e.paymentMethod ?? '',
        e.receiptNumber ?? '',
        e.paymentStatus,
        e.notes ?? '',
      ]
        .map(escapeCell)
        .join(','),
    );
  }
  return lines.join('\n');
}

export async function shareExpensesCsv(
  expenses: Expense[],
  fileBaseName = 'cenaiva-expenses',
): Promise<boolean> {
  if (expenses.length === 0) return false;
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) return false;

  const csv = buildExpensesCsv(expenses);
  const stamp = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `${fileBaseName}-${stamp}.csv`);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(csv);

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export expenses',
    UTI: 'public.comma-separated-values-text',
  });
  return true;
}
