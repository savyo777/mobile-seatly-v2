// Supabase Storage bucket names. Centralized so a rename only happens in
// one place. Buckets are created by SQL migrations under
// supabase/migrations/.

export const RECEIPTS_BUCKET = 'receipts';

// Path convention for the receipts bucket:
//   `{restaurant_id}/{expense_id}.jpg`
// The first segment is what the storage RLS policies key off of.
export function receiptObjectPath(restaurantId: string, expenseId: string): string {
  return `${restaurantId}/${expenseId}.jpg`;
}
