// Fixed catalog of expense categories used by the receipt-scanner review
// screen and the expenses list. Keys MUST match the
// `expenses_category_check` constraint on public.expenses; if you add or
// remove a category here, update the CHECK constraint in the same change.
//
// Receipt scanner v1 surfaces the subset of categories owners are most
// likely to file from a paper receipt; the rest (sales, preorders,
// gift_cards, ...) are handled by other parts of the app but still
// included here so the catalog stays aligned with the DB.

export const EXPENSE_CATEGORIES = [
  { key: 'food_cost',     label: 'Food cost',     glyph: '◐' },
  { key: 'food_supplies', label: 'Food supplies', glyph: '◑' },
  { key: 'beverages',     label: 'Beverages',     glyph: '◔' },
  { key: 'utilities',     label: 'Utilities',     glyph: '◈' },
  { key: 'rent',          label: 'Rent',          glyph: '◇' },
  { key: 'equipment',     label: 'Equipment',     glyph: '◊' },
  { key: 'marketing',     label: 'Marketing',     glyph: '◉' },
  { key: 'staff',         label: 'Staff',         glyph: '○' },
  { key: 'supplies',      label: 'Supplies',      glyph: '◌' },
  { key: 'maintenance',   label: 'Maintenance',   glyph: '◍' },
  { key: 'cleaning',      label: 'Cleaning',      glyph: '◎' },
  { key: 'sales',         label: 'Sales',         glyph: '●' },
  { key: 'preorders',     label: 'Pre-orders',    glyph: '◐' },
  { key: 'events',        label: 'Events',        glyph: '◓' },
  { key: 'catering',      label: 'Catering',      glyph: '◒' },
  { key: 'delivery',      label: 'Delivery',      glyph: '◫' },
  { key: 'gift_cards',    label: 'Gift cards',    glyph: '◧' },
  { key: 'other',         label: 'Other',         glyph: '·' },
] as const;

export type ExpenseCategoryKey = typeof EXPENSE_CATEGORIES[number]['key'];

export const EXPENSE_CATEGORY_KEYS: readonly ExpenseCategoryKey[] =
  EXPENSE_CATEGORIES.map((c) => c.key);

export function getExpenseCategory(key: string) {
  return EXPENSE_CATEGORIES.find((c) => c.key === key);
}

export function getExpenseCategoryLabel(key: string): string {
  return getExpenseCategory(key)?.label ?? 'Other';
}

export function isExpenseCategoryKey(value: string): value is ExpenseCategoryKey {
  return (EXPENSE_CATEGORY_KEYS as readonly string[]).includes(value);
}
