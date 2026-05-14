import { getSupabase } from '@/lib/supabase/client';
import {
  expenseFromRow,
  type Expense,
  type ExpenseFrequency,
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
  paymentMethod?: string | null;
  receiptNumber?: string | null;
  frequency?: ExpenseFrequency;
  recurringEndDate?: string | null;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function nextDueDate(startDate: string, frequency: ExpenseFrequency): string {
  const start = new Date(`${startDate}T12:00:00`);
  if (Number.isNaN(start.getTime())) return startDate;

  switch (frequency) {
    case 'weekly':
      start.setDate(start.getDate() + 7);
      break;
    case 'bi_weekly':
      start.setDate(start.getDate() + 14);
      break;
    case 'monthly':
      return addMonths(start, 1).toISOString().slice(0, 10);
    case 'quarterly':
      return addMonths(start, 3).toISOString().slice(0, 10);
    case 'yearly':
      start.setFullYear(start.getFullYear() + 1);
      break;
    case 'one_time':
      return startDate;
  }

  return start.toISOString().slice(0, 10);
}

async function createRecurringExpenseRule(input: CreateExpenseInput): Promise<string | null> {
  const frequency = input.frequency ?? 'one_time';
  if (frequency === 'one_time') return null;

  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('recurring_expense_rules')
    .insert({
      restaurant_id: input.restaurantId,
      transaction_type: input.transactionType ?? 'expense',
      vendor_name: input.vendorName ?? '',
      category: input.category,
      description: input.description,
      amount: input.amount,
      tax_amount: input.taxAmount ?? 0,
      total_amount: input.totalAmount,
      currency: input.currency,
      frequency,
      interval_count: 1,
      start_date: input.expenseDate,
      next_due_date: nextDueDate(input.expenseDate, frequency),
      end_date: input.recurringEndDate || null,
      is_active: true,
    })
    .select('id')
    .single();
  if (error) throw error;
  return typeof data?.id === 'string' ? data.id : null;
}

function inputToRow(input: CreateExpenseInput, recurringRuleId: string | null): Record<string, unknown> {
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
    recurring_rule_id: recurringRuleId,
    receipt_url: input.receiptUrl,
    receipt_type: input.receiptType,
    notes: input.notes,
    ai_categorized: input.aiCategorized,
    ai_extracted_data: input.aiExtractedData ?? null,
    payment_method: input.paymentMethod ?? null,
    receipt_number: input.receiptNumber ?? null,
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
  const recurringRuleId = await createRecurringExpenseRule(input);
  const { data, error } = await supabase
    .from('expenses')
    .insert(inputToRow(input, recurringRuleId))
    .select('*')
    .single();
  if (error) {
    if (recurringRuleId) {
      await supabase.from('recurring_expense_rules').delete().eq('id', recurringRuleId);
    }
    throw error;
  }
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
  | 'paymentMethod'
  | 'receiptNumber'
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
  if (patch.paymentMethod !== undefined) out.payment_method = patch.paymentMethod;
  if (patch.receiptNumber !== undefined) out.receipt_number = patch.receiptNumber;
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
