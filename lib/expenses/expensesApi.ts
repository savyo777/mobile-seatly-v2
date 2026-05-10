import { getSupabase } from '@/lib/supabase/client';
import {
  expenseFromRow,
  type Expense,
  type ExpenseRow,
} from '@/lib/expenses/types';
import type { ExpenseCategoryKey } from '@/lib/owner/expenseCategories';

export interface CreateExpenseInput {
  restaurantId: string;
  createdByUserId: string;
  vendor: string;
  expenseDate: string;
  subtotalCents: number | null;
  taxCents: number | null;
  tipCents: number | null;
  totalCents: number;
  currency: string;
  category: ExpenseCategoryKey;
  paymentMethod: string | null;
  paymentMethodLast4: string | null;
  imagePath: string | null;
  notes: string | null;
  aiExtracted: boolean;
  aiRaw: unknown;
}

function inputToRow(input: CreateExpenseInput): Omit<ExpenseRow, 'id' | 'created_at'> {
  return {
    restaurant_id: input.restaurantId,
    created_by_user_id: input.createdByUserId,
    vendor: input.vendor,
    expense_date: input.expenseDate,
    subtotal_cents: input.subtotalCents,
    tax_cents: input.taxCents,
    tip_cents: input.tipCents,
    total_cents: input.totalCents,
    currency: input.currency,
    category: input.category,
    payment_method: input.paymentMethod,
    payment_method_last4: input.paymentMethodLast4,
    image_path: input.imagePath,
    notes: input.notes,
    ai_extracted: input.aiExtracted,
    ai_raw: input.aiRaw ?? null,
  };
}

export async function listExpenses(restaurantId: string): Promise<Expense[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('restaurant_id', restaurantId)
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
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

export type UpdateExpensePatch = Partial<Pick<
  CreateExpenseInput,
  | 'vendor'
  | 'expenseDate'
  | 'subtotalCents'
  | 'taxCents'
  | 'tipCents'
  | 'totalCents'
  | 'currency'
  | 'category'
  | 'paymentMethod'
  | 'paymentMethodLast4'
  | 'imagePath'
  | 'notes'
>>;

function patchToRow(patch: UpdateExpensePatch): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.vendor !== undefined) out.vendor = patch.vendor;
  if (patch.expenseDate !== undefined) out.expense_date = patch.expenseDate;
  if (patch.subtotalCents !== undefined) out.subtotal_cents = patch.subtotalCents;
  if (patch.taxCents !== undefined) out.tax_cents = patch.taxCents;
  if (patch.tipCents !== undefined) out.tip_cents = patch.tipCents;
  if (patch.totalCents !== undefined) out.total_cents = patch.totalCents;
  if (patch.currency !== undefined) out.currency = patch.currency;
  if (patch.category !== undefined) out.category = patch.category;
  if (patch.paymentMethod !== undefined) out.payment_method = patch.paymentMethod;
  if (patch.paymentMethodLast4 !== undefined) out.payment_method_last4 = patch.paymentMethodLast4;
  if (patch.imagePath !== undefined) out.image_path = patch.imagePath;
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
