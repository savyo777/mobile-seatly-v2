import type { ExpenseCategoryKey } from '@/lib/owner/expenseCategories';

// Money is stored as integer cents in the DB. Keep it that way in the
// app and only format on render (lib/i18n/formatCurrency.ts).
export interface Expense {
  id: string;
  restaurantId: string;
  createdByUserId: string;
  createdAt: string;

  vendor: string;
  expenseDate: string;          // ISO date (YYYY-MM-DD)
  subtotalCents: number | null;
  taxCents: number | null;
  tipCents: number | null;
  totalCents: number;
  currency: string;             // ISO 4217 (e.g. "USD")

  category: ExpenseCategoryKey;
  paymentMethod: string | null; // 'card' | 'cash' | 'other' | null
  paymentMethodLast4: string | null;

  imagePath: string | null;
  notes: string | null;

  aiExtracted: boolean;
}

// Returned by the scan-receipt edge function. Fields the model couldn't
// determine come back as null. The client decides what to keep / edit
// before calling createExpense.
export interface ExpenseDraft {
  vendor: string | null;
  expenseDate: string | null;
  subtotalCents: number | null;
  taxCents: number | null;
  tipCents: number | null;
  totalCents: number | null;
  currency: string | null;
  category: ExpenseCategoryKey | null;
  paymentMethod: string | null;
  paymentMethodLast4: string | null;
}

// Tracks which fields came from the AI vs the human, so the review
// screen can render the ✨ glyph and fade it on first edit.
export type ExpenseDraftFieldKey = keyof ExpenseDraft;

export interface ScanReceiptResult {
  draft: ExpenseDraft;
  aiRaw: unknown;
  // Fields the AI populated. The review screen treats anything in this
  // set as "AI-suggested" until the owner edits it.
  extractedFields: ExpenseDraftFieldKey[];
}

// Database row shape (snake_case) for direct supabase-js typing.
export interface ExpenseRow {
  id: string;
  restaurant_id: string;
  created_by_user_id: string;
  created_at: string;
  vendor: string;
  expense_date: string;
  subtotal_cents: number | null;
  tax_cents: number | null;
  tip_cents: number | null;
  total_cents: number;
  currency: string;
  category: string;
  payment_method: string | null;
  payment_method_last4: string | null;
  image_path: string | null;
  notes: string | null;
  ai_extracted: boolean;
  ai_raw: unknown;
}

export function expenseFromRow(row: ExpenseRow): Expense {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    vendor: row.vendor,
    expenseDate: row.expense_date,
    subtotalCents: row.subtotal_cents,
    taxCents: row.tax_cents,
    tipCents: row.tip_cents,
    totalCents: row.total_cents,
    currency: row.currency,
    category: row.category as ExpenseCategoryKey,
    paymentMethod: row.payment_method,
    paymentMethodLast4: row.payment_method_last4,
    imagePath: row.image_path,
    notes: row.notes,
    aiExtracted: row.ai_extracted,
  };
}
