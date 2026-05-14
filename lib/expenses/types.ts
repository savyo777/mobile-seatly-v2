import type { ExpenseCategoryKey } from '@/lib/owner/expenseCategories';

// Mirrors public.expenses on Supabase. Money is stored as `numeric`
// (decimal dollars), not integer cents — the existing schema is shared
// with the web app and uses decimal columns. Keep the app representation
// the same so we never have to convert.
export interface Expense {
  id: string;
  restaurantId: string;
  /** FK to user_profiles.id (NOT auth.users.id). */
  createdBy: string;
  createdAt: string;

  vendorName: string | null;
  description: string | null;
  expenseDate: string;          // ISO date YYYY-MM-DD

  amount: number;               // pre-tax (or all-in if no breakdown)
  taxAmount: number | null;
  totalAmount: number;
  currency: string;             // lowercase ISO 4217 ('cad' is the DB default)

  category: ExpenseCategoryKey;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  transactionType: TransactionType;

  receiptUrl: string | null;
  receiptType: ReceiptType | null;

  aiCategorized: boolean;
  aiExtractedData: unknown;

  notes: string | null;

  paymentMethod: string | null;
}

export type PaymentStatus = 'paid' | 'due' | 'scheduled' | 'overdue';
export type TransactionType = 'expense' | 'income';
export type ReceiptType = 'image' | 'pdf';
export type ExpenseFrequency = 'one_time' | 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'yearly';

// Returned by the scan-receipt edge function. Fields the model couldn't
// determine come back as null. The client decides what to keep / edit
// before calling createExpense.
export interface ExpenseDraft {
  vendor: string | null;
  expenseDate: string | null;
  /** Pre-tax amount, in decimal dollars. */
  amount: number | null;
  /** Tax, in decimal dollars. */
  taxAmount: number | null;
  /** All-in receipt total, in decimal dollars. */
  totalAmount: number | null;
  currency: string | null;
  category: ExpenseCategoryKey | null;
  paymentMethod: string | null;
}

export type ExpenseDraftFieldKey = keyof ExpenseDraft;

export interface ScanReceiptResult {
  draft: ExpenseDraft;
  aiRaw: unknown;
  // Fields the AI populated. The review screen treats anything in this
  // set as "AI-suggested" until the owner edits it.
  extractedFields: ExpenseDraftFieldKey[];
}

// Database row shape (snake_case). Matches the live schema exactly.
export interface ExpenseRow {
  id: string;
  restaurant_id: string;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;

  vendor_name: string | null;
  description: string | null;
  expense_date: string;
  amount: string | number;
  tax_amount: string | number | null;
  total_amount: string | number;
  currency: string | null;

  receipt_url: string | null;
  receipt_type: string | null;

  ai_categorized: boolean | null;
  ai_extracted_data: unknown;

  notes: string | null;
  category: string;
  payment_status: string;
  paid_at: string | null;
  recurring_rule_id: string | null;
  transaction_type: string;
  payment_method: string | null;
}

// Postgres `numeric` columns come back from supabase-js as either string
// or number depending on driver version. Coerce defensively.
function asNumber(value: string | number | null | undefined, fallback = 0): number {
  if (value == null) return fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asNullableNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function expenseFromRow(row: ExpenseRow): Expense {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    createdBy: row.created_by,
    createdAt: row.created_at ?? new Date().toISOString(),
    vendorName: row.vendor_name,
    description: row.description,
    expenseDate: row.expense_date,
    amount: asNumber(row.amount),
    taxAmount: asNullableNumber(row.tax_amount),
    totalAmount: asNumber(row.total_amount),
    currency: (row.currency ?? 'cad').toLowerCase(),
    category: row.category as ExpenseCategoryKey,
    paymentStatus: (row.payment_status as PaymentStatus) ?? 'paid',
    paidAt: row.paid_at,
    transactionType: (row.transaction_type as TransactionType) ?? 'expense',
    receiptUrl: row.receipt_url,
    receiptType: (row.receipt_type as ReceiptType | null) ?? null,
    aiCategorized: row.ai_categorized ?? false,
    aiExtractedData: row.ai_extracted_data ?? null,
    notes: row.notes,
    paymentMethod: row.payment_method,
  };
}
