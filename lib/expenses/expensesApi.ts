import { getSupabase } from '@/lib/supabase/client';
import {
  expenseFromRow,
  type Expense,
  type ExpenseRow,
  type PaymentStatus,
  type ReceiptType,
  type TransactionType,
} from '@/lib/expenses/types';
import type { ExpenseCategoryKey } from '@/lib/owner/expenseCategories';

export interface CreateExpenseInput {
  restaurantId: string;
  /** user_profiles.id of the row author (NOT auth.users.id). */
  createdBy: string;
  vendorName: string | null;
  description: string | null;
  expenseDate: string;
  amount: number;
  taxAmount: number | null;
  totalAmount: number;
  currency: string;
  category: ExpenseCategoryKey;
  paymentStatus?: PaymentStatus;
  paidAt?: string | null;
  transactionType?: TransactionType;
  receiptUrl: string | null;
  receiptType: ReceiptType | null;
  notes: string | null;
  aiCategorized: boolean;
  aiExtractedData: unknown;
}

function inputToRow(input: CreateExpenseInput): Record<string, unknown> {
  return {
    restaurant_id: input.restaurantId,
    created_by: input.createdBy,
    vendor_name: input.vendorName,
    description: input.description,
    expense_date: input.expenseDate,
    amount: input.amount,
    tax_amount: input.taxAmount,
    total_amount: input.totalAmount,
    currency: input.currency,
    category: input.category,
    payment_status: input.paymentStatus ?? 'paid',
    paid_at: input.paidAt ?? null,
    transaction_type: input.transactionType ?? 'expense',
    receipt_url: input.receiptUrl,
    receipt_type: input.receiptType,
    notes: input.notes,
    ai_categorized: input.aiCategorized,
    ai_extracted_data: input.aiExtractedData ?? null,
  };
}

export async function listExpenses(restaurantId: string): Promise<Expense[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .is('deleted_at', null)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as ExpenseRow[]).map(expenseFromRow);
}

export async function getExpense(id: string): Promise<Expense | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? expenseFromRow(data as ExpenseRow) : null;
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('expenses')
    .insert(inputToRow(input))
    .select('*')
    .single();
  if (error) throw error;
  return data ? expenseFromRow(data as ExpenseRow) : null;
}

export async function deleteExpense(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  // Soft-delete to match the schema's deleted_at convention.
  const { error } = await supabase
    .from('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export type UpdateExpensePatch = Partial<Pick<
  CreateExpenseInput,
  | 'vendorName'
  | 'description'
  | 'expenseDate'
  | 'amount'
  | 'taxAmount'
  | 'totalAmount'
  | 'currency'
  | 'category'
  | 'paymentStatus'
  | 'paidAt'
  | 'transactionType'
  | 'receiptUrl'
  | 'receiptType'
  | 'notes'
>>;

function patchToRow(patch: UpdateExpensePatch): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.vendorName !== undefined) out.vendor_name = patch.vendorName;
  if (patch.description !== undefined) out.description = patch.description;
  if (patch.expenseDate !== undefined) out.expense_date = patch.expenseDate;
  if (patch.amount !== undefined) out.amount = patch.amount;
  if (patch.taxAmount !== undefined) out.tax_amount = patch.taxAmount;
  if (patch.totalAmount !== undefined) out.total_amount = patch.totalAmount;
  if (patch.currency !== undefined) out.currency = patch.currency;
  if (patch.category !== undefined) out.category = patch.category;
  if (patch.paymentStatus !== undefined) out.payment_status = patch.paymentStatus;
  if (patch.paidAt !== undefined) out.paid_at = patch.paidAt;
  if (patch.transactionType !== undefined) out.transaction_type = patch.transactionType;
  if (patch.receiptUrl !== undefined) out.receipt_url = patch.receiptUrl;
  if (patch.receiptType !== undefined) out.receipt_type = patch.receiptType;
  if (patch.notes !== undefined) out.notes = patch.notes;
  return out;
}

export async function updateExpense(id: string, patch: UpdateExpensePatch): Promise<Expense | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('expenses')
    .update(patchToRow(patch))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data ? expenseFromRow(data as ExpenseRow) : null;
}

/**
 * Resolves the user_profiles.id for the currently signed-in auth user.
 * Required because public.expenses.created_by is FK'd to user_profiles.id,
 * not auth.users.id.
 */
export async function getCurrentUserProfileId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: userData } = await supabase.auth.getUser();
  const authUserId = userData.user?.id;
  if (!authUserId) return null;
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (error || !data) return null;
  return typeof data.id === 'string' ? data.id : null;
}
