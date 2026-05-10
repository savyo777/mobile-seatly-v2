// Fixed catalog of expense categories shown in the receipt-scanner review
// screen and the expenses list. The `key` is what gets persisted to
// `expenses.category`; the `label` is what owners see; the `glyph` is a
// monochrome unicode mark used in chips to distinguish categories at a
// glance without relying on color.
//
// v1 is fixed: no per-restaurant customization. If a restaurant needs a
// category that isn't here, the receipt should be tagged "Other" and the
// catalog expanded in a future migration.

export const EXPENSE_CATEGORIES = [
  { key: 'food_beverage', label: 'Food & Beverage', glyph: '◐' },
  { key: 'alcohol',       label: 'Alcohol',         glyph: '◔' },
  { key: 'fuel',          label: 'Fuel',            glyph: '◇' },
  { key: 'utilities',     label: 'Utilities',       glyph: '◈' },
  { key: 'repairs',       label: 'Repairs',         glyph: '◊' },
  { key: 'supplies',      label: 'Supplies',        glyph: '○' },
  { key: 'marketing',     label: 'Marketing',       glyph: '◉' },
  { key: 'other',         label: 'Other',           glyph: '·' },
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
