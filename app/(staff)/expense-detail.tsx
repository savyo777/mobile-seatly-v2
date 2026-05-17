import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { GlassCard } from '@/components/owner/GlassCard';
import { MonthCalendar } from '@/components/owner/MonthCalendar';
import { useExpenses } from '@/lib/context/ExpensesContext';
import { getReceiptSignedUrl } from '@/lib/expenses/uploadReceiptImage';
import { getCachedReceiptPreview, isDirectReceiptUri } from '@/lib/expenses/receiptPreviewCache';
import {
  EXPENSE_CATEGORIES,
  getExpenseCategoryLabel,
  type ExpenseCategoryKey,
} from '@/lib/owner/expenseCategories';
import type { Expense, PaymentStatus, TransactionType } from '@/lib/expenses/types';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { createStyles } from '@/lib/theme';
import { ownerColorsFromPalette, ownerRadii, ownerSpace, useOwnerColors } from '@/lib/theme/ownerTheme';
import { brandGold, withAlpha } from '@/lib/theme/tokens';
import { normalizeTextInput, sanitizeMoneyInput, sanitizeTextInput } from '@/lib/validation/input';
import { friendlyError } from '@/lib/errors/friendlyError';

const TRANSACTION_TYPES: Array<{ value: TransactionType; label: string }> = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
];

const PAYMENT_STATUSES: Array<{ value: PaymentStatus; label: string }> = [
  { value: 'paid', label: 'Paid' },
  { value: 'due', label: 'Due' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'overdue', label: 'Overdue' },
];

function dollarsToInputString(amount: number | null | undefined): string {
  if (amount == null) return '';
  return amount.toFixed(2);
}

function parseDollarsInput(value: string): number | null {
  const cleaned = value.replace(/[^0-9.,-]/g, '').replace(',', '.');
  if (!cleaned) return null;
  const dollars = parseFloat(cleaned);
  if (!Number.isFinite(dollars)) return null;
  return Math.round(dollars * 100) / 100;
}

function formatHumanDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type ConversionMetadata = {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  convertedCurrency: string;
  rate: number;
  provider: string;
  quotedAt: string;
};

// Pulls the FX-conversion blob written by expense-review out of the
// (intentionally untyped) `aiExtractedData` JSON. Returns null whenever
// the row was saved without a currency conversion attached.
function readConversion(aiExtractedData: unknown): ConversionMetadata | null {
  if (!aiExtractedData || typeof aiExtractedData !== 'object') return null;
  const blob = (aiExtractedData as Record<string, unknown>).conversion;
  if (!blob || typeof blob !== 'object') return null;
  const c = blob as Record<string, unknown>;
  const originalAmount = typeof c.originalAmount === 'number' ? c.originalAmount : null;
  const originalCurrency = typeof c.originalCurrency === 'string' ? c.originalCurrency : null;
  const convertedAmount = typeof c.convertedAmount === 'number' ? c.convertedAmount : null;
  const convertedCurrency = typeof c.convertedCurrency === 'string' ? c.convertedCurrency : null;
  const rate = typeof c.rate === 'number' ? c.rate : null;
  if (
    originalAmount == null ||
    !originalCurrency ||
    convertedAmount == null ||
    !convertedCurrency ||
    rate == null
  ) {
    return null;
  }
  return {
    originalAmount,
    originalCurrency: originalCurrency.toLowerCase(),
    convertedAmount,
    convertedCurrency: convertedCurrency.toLowerCase(),
    rate,
    provider: typeof c.provider === 'string' ? c.provider : 'fx',
    quotedAt: typeof c.quotedAt === 'string' ? c.quotedAt : '',
  };
}

function statusLabel(status: PaymentStatus, type: TransactionType): string {
  if (type === 'income') {
    if (status === 'due') return 'Expected';
    if (status === 'paid') return 'Received';
  }
  return PAYMENT_STATUSES.find((option) => option.value === status)?.label ?? 'Paid';
}

export default function ExpenseDetailScreen() {
  const router = useRouter();
  const ownerColors = useOwnerColors();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { expenses, removeExpense, patchExpense, addLocalExpense } = useExpenses();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [vendor, setVendor] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  // Three-field money model: subtotal + tax = total. Smart auto-fill keeps
  // the total in sync until the owner types directly into it (penny rounding
  // override).
  const [subtotal, setSubtotal] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [totalManuallyEdited, setTotalManuallyEdited] = useState(false);
  const [category, setCategory] = useState<ExpenseCategoryKey>('other');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  const expense = useMemo(
    () => (id ? expenses.find((e) => e.id === id) ?? null : null),
    [expenses, id],
  );

  useEffect(() => {
    let cancelled = false;
    if (!expense?.receiptUrl) {
      setSignedUrl(expense ? getCachedReceiptPreview(expense) : null);
      return;
    }
    const cached = getCachedReceiptPreview(expense);
    if (cached) {
      setSignedUrl(cached);
      return;
    }
    if (isDirectReceiptUri(expense.receiptUrl)) {
      setSignedUrl(expense.receiptUrl);
      return;
    }
    (async () => {
      const url = await getReceiptSignedUrl(expense.receiptUrl ?? '');
      if (!cancelled) setSignedUrl(url ?? getCachedReceiptPreview(expense));
    })();
    return () => {
      cancelled = true;
    };
  }, [expense?.receiptUrl]);

  useEffect(() => {
    if (!expense) return;
    setTransactionType(expense.transactionType);
    setVendor(expense.vendorName ?? '');
    setDescription(expense.description ?? '');
    setExpenseDate(expense.expenseDate);
    // Hide Subtotal when the saved row has no tax breakdown — same UX
    // rule as expense-review: a single-line receipt shouldn't duplicate
    // the total into the Subtotal field.
    const hasRealBreakdown = expense.taxAmount != null;
    setSubtotal(hasRealBreakdown ? dollarsToInputString(expense.amount) : '');
    setTaxAmount(dollarsToInputString(expense.taxAmount));
    setTotalAmount(dollarsToInputString(expense.totalAmount));
    // Saved total is source-of-truth — lock it so smart auto-fill in
    // edit mode doesn't overwrite the verified bottom-line.
    setTotalManuallyEdited(true);
    setCategory(expense.category);
    setPaymentStatus(expense.paymentStatus);
    setNotes(expense.notes ?? '');
    setPaymentMethod(expense.paymentMethod ?? '');
  }, [expense]);

  const handleClose = useCallback(() => {
    router.replace('/(staff)/expenses' as never);
  }, [router]);

  const handleDelete = useCallback(() => {
    if (!expense) return;
    Alert.alert(
      'Delete expense',
      `Delete the expense from ${expense.vendorName ?? 'this vendor'}? The receipt image will also be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeExpense(expense.id);
            router.replace('/(staff)/expenses' as never);
          },
        },
      ],
    );
  }, [expense, removeExpense, router]);

  const handleCancelEdit = useCallback(() => {
    if (!expense) return;
    setTransactionType(expense.transactionType);
    setVendor(expense.vendorName ?? '');
    setDescription(expense.description ?? '');
    setExpenseDate(expense.expenseDate);
    const hasRealBreakdown = expense.taxAmount != null;
    setSubtotal(hasRealBreakdown ? dollarsToInputString(expense.amount) : '');
    setTaxAmount(dollarsToInputString(expense.taxAmount));
    setTotalAmount(dollarsToInputString(expense.totalAmount));
    setTotalManuallyEdited(true);
    setCategory(expense.category);
    setPaymentStatus(expense.paymentStatus);
    setNotes(expense.notes ?? '');
    setPaymentMethod(expense.paymentMethod ?? '');
    setEditing(false);
  }, [expense]);

  // Smart auto-fill handlers for the money trio. Editing subtotal or tax
  // updates total until the owner types directly into total (then their
  // value wins, matching real receipts with penny-rounding tolerance).
  const handleSubtotalChange = useCallback((value: string) => {
    const sanitized = sanitizeMoneyInput(value);
    setSubtotal(sanitized);
    if (!totalManuallyEdited) {
      const s = parseDollarsInput(sanitized) ?? 0;
      const t = parseDollarsInput(taxAmount) ?? 0;
      setTotalAmount(dollarsToInputString(s + t));
    }
  }, [taxAmount, totalManuallyEdited]);

  const handleTaxChange = useCallback((value: string) => {
    const sanitized = sanitizeMoneyInput(value);
    setTaxAmount(sanitized);
    if (!totalManuallyEdited) {
      const s = parseDollarsInput(subtotal) ?? 0;
      const t = parseDollarsInput(sanitized) ?? 0;
      setTotalAmount(dollarsToInputString(s + t));
    }
  }, [subtotal, totalManuallyEdited]);

  const handleTotalChange = useCallback((value: string) => {
    setTotalAmount(sanitizeMoneyInput(value));
    setTotalManuallyEdited(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!expense || saving) return;
    if (!vendor.trim()) {
      Alert.alert(
        transactionType === 'income' ? 'Missing source' : 'Missing vendor',
        transactionType === 'income' ? 'Add a source before saving.' : 'Add a vendor before saving.',
      );
      return;
    }
    // Total is source-of-truth for "amount paid". Subtotal mirrors total when
    // empty (single-line receipts). Tax is optional — null when not provided.
    const totalNum = parseDollarsInput(totalAmount);
    if (totalNum == null || totalNum < 0) {
      Alert.alert('Missing total', 'Enter the total amount before saving.');
      return;
    }
    const subtotalNum = parseDollarsInput(subtotal);
    const taxNum = parseDollarsInput(taxAmount);
    const persistedAmount = subtotalNum != null && subtotalNum >= 0 ? subtotalNum : totalNum;
    const persistedTax = taxNum != null && taxNum > 0 ? taxNum : null;
    const paidAt = paymentStatus === 'paid' ? (expense.paidAt ?? new Date().toISOString()) : null;

    setSaving(true);
    try {
      const patch = {
        vendorName: normalizeTextInput(vendor, { maxLength: 120 }),
        description: normalizeTextInput(description, { maxLength: 500 }) || null,
        expenseDate,
        amount: persistedAmount,
        taxAmount: persistedTax,
        totalAmount: totalNum,
        category,
        paymentStatus,
        paidAt,
        transactionType,
        notes: normalizeTextInput(notes, { maxLength: 1000, multiline: true }) || null,
        paymentMethod: normalizeTextInput(paymentMethod, { maxLength: 80 }) || null,
      };
      if (expense.id.startsWith('local-')) {
        const updated: Expense = {
          ...expense,
          vendorName: patch.vendorName,
          description: patch.description,
          expenseDate: patch.expenseDate,
          amount: patch.amount,
          taxAmount: patch.taxAmount,
          totalAmount: patch.totalAmount,
          category: patch.category,
          paymentStatus: patch.paymentStatus,
          paidAt: patch.paidAt,
          transactionType: patch.transactionType,
          notes: patch.notes,
          paymentMethod: patch.paymentMethod,
        };
        addLocalExpense(updated);
      } else {
        await patchExpense(expense.id, patch);
      }
      setEditing(false);
    } catch (err) {
      Alert.alert('Couldn’t save changes', friendlyError(err, "Couldn’t save changes to this expense. Please try again."));
    } finally {
      setSaving(false);
    }
  }, [
    expense,
    saving,
    vendor,
    transactionType,
    subtotal,
    taxAmount,
    totalAmount,
    paymentStatus,
    description,
    expenseDate,
    category,
    notes,
    paymentMethod,
    addLocalExpense,
    patchExpense,
  ]);

  if (!expense) {
    return (
      <View style={styles.screen}>
        <OwnerScreen contentContainerStyle={styles.scrollPad}>
          <View style={styles.headRow}>
            <Pressable onPress={handleClose} hitSlop={10} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={26} color={ownerColors.gold} />
            </Pressable>
            <View style={styles.headText}>
              <Text style={styles.title}>Expense not found</Text>
            </View>
            <View style={styles.deleteBtnPlaceholder} />
          </View>
          <Text style={styles.body}>This expense may have been deleted.</Text>
        </OwnerScreen>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <OwnerScreen contentContainerStyle={styles.scrollPad}>
        <Animated.View entering={FadeInDown.duration(220)} style={styles.headRow}>
          <Pressable onPress={handleClose} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={ownerColors.gold} />
          </Pressable>
          <View style={styles.headText}>
            <Text style={styles.title}>{editing ? 'Edit entry' : expense.vendorName ?? '—'}</Text>
            <Text style={styles.subtitle}>
              {editing ? 'Fix AI extraction or manual entry mistakes.' : `${expense.expenseDate} · ${getExpenseCategoryLabel(expense.category)}`}
            </Text>
          </View>
          {editing ? (
            <Pressable onPress={handleCancelEdit} hitSlop={10} style={styles.deleteBtn}>
              <Ionicons name="close" size={21} color={ownerColors.textMuted} />
            </Pressable>
          ) : (
            <View style={styles.headerActions}>
              <Pressable onPress={() => setEditing(true)} hitSlop={10} style={styles.iconBtn}>
                <Ionicons name="create-outline" size={20} color={ownerColors.gold} />
              </Pressable>
              <Pressable onPress={handleDelete} hitSlop={10} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={20} color={ownerColors.danger} />
              </Pressable>
            </View>
          )}
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <GlassCard variant="primary" style={styles.imageCard}>
            {signedUrl ? (
              <Image source={{ uri: signedUrl }} style={styles.image} contentFit="contain" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="document-outline" size={32} color={ownerColors.textMuted} />
                <Text style={styles.imagePlaceholderText}>
                  {expense.receiptUrl ? 'Loading receipt…' : 'No receipt image attached'}
                </Text>
              </View>
            )}
          </GlassCard>

          {editing ? (
            <EditForm
              transactionType={transactionType}
              setTransactionType={setTransactionType}
              vendor={vendor}
              setVendor={setVendor}
              description={description}
              setDescription={setDescription}
              expenseDate={expenseDate}
              openDatePicker={() => setDatePickerOpen(true)}
              subtotal={subtotal}
              onSubtotalChange={handleSubtotalChange}
              taxAmount={taxAmount}
              onTaxChange={handleTaxChange}
              totalAmount={totalAmount}
              onTotalChange={handleTotalChange}
              category={category}
              setCategory={setCategory}
              paymentStatus={paymentStatus}
              setPaymentStatus={setPaymentStatus}
              notes={notes}
              setNotes={setNotes}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              currency={expense.currency}
              saving={saving}
              onCancel={handleCancelEdit}
              onSave={handleSaveEdit}
            />
          ) : (
            <>

          <GlassCard variant="secondary" style={styles.totalCard}>
            {/* Subtotal + Tax breakdown shown only when the row carries a
                tax_amount; legacy rows (saved before this feature) skip the
                breakdown and show just the total so old data stays clean. */}
            {expense.taxAmount != null ? (
              <View style={styles.breakdownRows}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Subtotal</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(expense.amount, expense.currency)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Tax</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(expense.taxAmount, expense.currency)}
                  </Text>
                </View>
              </View>
            ) : null}
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(expense.totalAmount, expense.currency)}
            </Text>
            {(() => {
              const conv = readConversion(expense.aiExtractedData);
              if (!conv) return null;
              return (
                <Text style={styles.conversionNote}>
                  Converted from {formatCurrency(conv.originalAmount, conv.originalCurrency)}
                  {' '}at 1 {conv.originalCurrency.toUpperCase()} = {conv.rate.toFixed(4)}{' '}
                  {conv.convertedCurrency.toUpperCase()}
                </Text>
              );
            })()}
            {expense.aiCategorized ? <Text style={styles.totalAiHint}>✨ AI extracted</Text> : null}
          </GlassCard>

          <View style={styles.detailGrid}>
            <DetailRow label="Status" value={capitalize(expense.paymentStatus)} />
            <DetailRow label="Currency" value={expense.currency.toUpperCase()} />
            {expense.paymentMethod ? (
              <DetailRow label="Payment" value={expense.paymentMethod} />
            ) : null}
          </View>

          {expense.notes ? (
            <GlassCard style={styles.notesCard}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesBody}>{expense.notes}</Text>
            </GlassCard>
          ) : null}
            </>
          )}

          <View style={{ height: ownerSpace.xl }} />
        </ScrollView>
      </OwnerScreen>
      </KeyboardAvoidingView>
      <MonthCalendar
        visible={datePickerOpen}
        value={expenseDate}
        title="Entry date"
        onClose={() => setDatePickerOpen(false)}
        onConfirm={(iso) => {
          setExpenseDate(iso);
          setDatePickerOpen(false);
        }}
      />
    </View>
  );
}

function EditForm({
  transactionType,
  setTransactionType,
  vendor,
  setVendor,
  description,
  setDescription,
  expenseDate,
  openDatePicker,
  subtotal,
  onSubtotalChange,
  taxAmount,
  onTaxChange,
  totalAmount,
  onTotalChange,
  category,
  setCategory,
  paymentStatus,
  setPaymentStatus,
  notes,
  setNotes,
  paymentMethod,
  setPaymentMethod,
  currency,
  saving,
  onCancel,
  onSave,
}: {
  transactionType: TransactionType;
  setTransactionType: (value: TransactionType) => void;
  vendor: string;
  setVendor: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  expenseDate: string;
  openDatePicker: () => void;
  subtotal: string;
  onSubtotalChange: (value: string) => void;
  taxAmount: string;
  onTaxChange: (value: string) => void;
  totalAmount: string;
  onTotalChange: (value: string) => void;
  category: ExpenseCategoryKey;
  setCategory: (value: ExpenseCategoryKey) => void;
  paymentStatus: PaymentStatus;
  setPaymentStatus: (value: PaymentStatus) => void;
  notes: string;
  setNotes: (value: string) => void;
  paymentMethod: string;
  setPaymentMethod: (value: string) => void;
  currency: string;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const ownerColors = useOwnerColors();
  const styles = useStyles();
  const categories = EXPENSE_CATEGORIES.filter((c) => (
    transactionType === 'income'
      ? ['sales', 'preorders', 'events', 'catering', 'delivery', 'gift_cards', 'other'].includes(c.key)
      : !['sales', 'preorders', 'events', 'catering', 'delivery', 'gift_cards'].includes(c.key)
  ));

  return (
    <View>
      <Text style={styles.fieldLabel}>Type</Text>
      <ChipRow
        options={TRANSACTION_TYPES}
        value={transactionType}
        onChange={setTransactionType}
      />

      <Text style={styles.fieldLabel}>{transactionType === 'income' ? 'Source' : 'Vendor'}</Text>
      <TextInput
        value={vendor}
        onChangeText={(value) => setVendor(sanitizeTextInput(value, { maxLength: 120 }))}
        placeholder={transactionType === 'income' ? 'DoorDash, event tickets, catering client' : 'Toronto Hydro'}
        placeholderTextColor={ownerColors.textMuted}
        style={styles.input}
      />

      <Text style={styles.fieldLabel}>Subtotal (before tax)</Text>
      <TextInput
        value={subtotal}
        onChangeText={onSubtotalChange}
        placeholder="0.00"
        placeholderTextColor={ownerColors.textMuted}
        style={styles.input}
        keyboardType="decimal-pad"
      />

      <Text style={styles.fieldLabel}>Tax</Text>
      <TextInput
        value={taxAmount}
        onChangeText={onTaxChange}
        placeholder="0.00"
        placeholderTextColor={ownerColors.textMuted}
        style={styles.input}
        keyboardType="decimal-pad"
      />

      <Text style={styles.fieldLabel}>Total</Text>
      <TextInput
        value={totalAmount}
        onChangeText={onTotalChange}
        placeholder="0.00"
        placeholderTextColor={ownerColors.textMuted}
        style={[styles.input, styles.inputTotal]}
        keyboardType="decimal-pad"
      />

      <Text style={styles.fieldLabel}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChips}>
        {categories.map((c) => {
          const on = c.key === category;
          return (
            <Pressable
              key={c.key}
              onPress={() => setCategory(c.key)}
              style={[styles.catChip, on && styles.catChipOn]}
            >
              <Text style={[styles.catGlyph, on && styles.catGlyphOn]}>{c.glyph}</Text>
              <Text style={[styles.catChipText, on && styles.catChipTextOn]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.fieldLabel}>Description</Text>
      <TextInput
        value={description}
        onChangeText={(value) => setDescription(sanitizeTextInput(value, { maxLength: 500 }))}
        placeholder={transactionType === 'income' ? 'Weekend pre-orders, private event deposit...' : 'May rent, weekly produce, annual insurance...'}
        placeholderTextColor={ownerColors.textMuted}
        style={styles.input}
      />


      <Text style={styles.fieldLabel}>Date</Text>
      <Pressable onPress={openDatePicker} style={styles.dateInputButton}>
        <Text style={styles.dateInputText}>{formatHumanDate(expenseDate)}</Text>
        <Ionicons name="calendar-outline" size={18} color={ownerColors.gold} />
      </Pressable>

      <Text style={styles.fieldLabel}>Status</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChips}>
        {PAYMENT_STATUSES.map((option) => {
          const on = option.value === paymentStatus;
          return (
            <Pressable
              key={option.value}
              onPress={() => setPaymentStatus(option.value)}
              style={[styles.catChip, on && styles.catChipOn]}
            >
              <Text style={[styles.catChipText, on && styles.catChipTextOn]}>
                {statusLabel(option.value, transactionType)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.fieldLabel}>Payment method (optional)</Text>
      <TextInput
        value={paymentMethod}
        onChangeText={(value) => setPaymentMethod(sanitizeTextInput(value, { maxLength: 80 }))}
        placeholder="Visa ****4242, cash, interac"
        placeholderTextColor={ownerColors.textMuted}
        style={styles.input}
        autoCapitalize="none"
      />

      <Text style={styles.fieldLabel}>Notes</Text>
      <TextInput
        value={notes}
        onChangeText={(value) => setNotes(sanitizeTextInput(value, { maxLength: 1000, multiline: true }))}
        placeholder="Internal notes for your team or accountant."
        placeholderTextColor={ownerColors.textMuted}
        style={[styles.input, styles.inputMultiline]}
        multiline
      />

      <View style={styles.editActions}>
        <Pressable style={styles.cancelEditBtn} onPress={onCancel} disabled={saving}>
          <Text style={styles.cancelEditText}>Cancel</Text>
        </Pressable>
        <Pressable style={[styles.saveEditBtn, saving && styles.saveEditBtnDisabled]} onPress={onSave} disabled={saving}>
          <Text style={styles.saveEditText}>{saving ? 'Saving…' : 'Save changes'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  const styles = useStyles();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChips}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.catChip, on && styles.catChipOn]}
          >
            <Text style={[styles.catChipText, on && styles.catChipTextOn]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function capitalize(value: string): string {
  if (!value) return value;
  return value[0].toUpperCase() + value.slice(1);
}

function DetailRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  const ownerColors = useOwnerColors();
  return (
    <View style={detailRowStyles.row}>
      <Text style={[detailRowStyles.label, { color: ownerColors.textMuted }]}>{label}</Text>
      <Text
        style={[
          detailRowStyles.value,
          { color: muted ? ownerColors.textMuted : ownerColors.text },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const detailRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(201,162,74,0.1)',
  },
  label: {
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
  },
});

const useStyles = createStyles((c) => {
  const ownerColors = ownerColorsFromPalette(c);
  return {
    screen: { flex: 1 },
    flex: { flex: 1 },
    scrollPad: { paddingTop: 2, paddingBottom: ownerSpace.xl },
    headRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: ownerSpace.sm,
      paddingBottom: ownerSpace.md,
    },
    backBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headText: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: ownerColors.text,
      fontSize: 20,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    subtitle: {
      color: ownerColors.textMuted,
      fontSize: 13,
      marginTop: 2,
    },
    deleteBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    iconBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteBtnPlaceholder: {
      width: 36,
      height: 36,
    },
    imageCard: {
      padding: 0,
      overflow: 'hidden',
      marginBottom: ownerSpace.md,
    },
    image: {
      width: '100%',
      height: 360,
    },
    imagePlaceholder: {
      width: '100%',
      height: 200,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: ownerColors.bgElevated,
    },
    imagePlaceholderText: {
      color: ownerColors.textMuted,
      fontSize: 13,
    },
    totalCard: {
      padding: ownerSpace.md,
      marginBottom: ownerSpace.md,
      backgroundColor: withAlpha(brandGold.dark, 0.08),
      borderColor: withAlpha(brandGold.dark, 0.22),
    },
    breakdownRows: {
      marginBottom: ownerSpace.sm,
      paddingBottom: ownerSpace.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: withAlpha(brandGold.dark, 0.18),
      gap: 4,
    },
    breakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    breakdownLabel: {
      color: ownerColors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    breakdownValue: {
      color: ownerColors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    totalLabel: {
      color: ownerColors.textMuted,
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      fontWeight: '700',
    },
    totalAmount: {
      color: ownerColors.gold,
      fontSize: 32,
      fontWeight: '800',
      marginTop: 4,
      letterSpacing: -0.5,
    },
    totalAiHint: {
      color: ownerColors.gold,
      fontSize: 12,
      marginTop: 6,
    },
    conversionNote: {
      color: ownerColors.textMuted,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 8,
    },
    detailGrid: {
      paddingHorizontal: 4,
      marginBottom: ownerSpace.md,
    },
    fieldLabel: {
      color: ownerColors.text,
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      marginTop: ownerSpace.md,
    },
    input: {
      marginTop: 6,
      backgroundColor: ownerColors.bgSurface,
      borderRadius: ownerRadii.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: ownerColors.text,
      fontSize: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ownerColors.border,
    },
    inputMultiline: {
      minHeight: 72,
      textAlignVertical: 'top',
    },
    inputTotal: {
      borderColor: withAlpha(brandGold.dark, 0.4),
      color: ownerColors.gold,
      fontWeight: '700',
    },
    catChips: {
      gap: 8,
      paddingTop: 6,
      paddingBottom: 4,
    },
    catChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ownerColors.border,
      backgroundColor: ownerColors.bgSurface,
    },
    catChipOn: {
      borderColor: withAlpha(brandGold.dark, 0.55),
      backgroundColor: withAlpha(brandGold.dark, 0.14),
    },
    catGlyph: {
      color: ownerColors.textMuted,
      fontSize: 13,
    },
    catGlyphOn: {
      color: ownerColors.gold,
    },
    catChipText: {
      color: ownerColors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    catChipTextOn: {
      color: ownerColors.text,
    },
    dateInputButton: {
      marginTop: 6,
      backgroundColor: ownerColors.bgSurface,
      borderRadius: ownerRadii.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ownerColors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    dateInputText: {
      color: ownerColors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    editActions: {
      flexDirection: 'row',
      gap: ownerSpace.sm,
      marginTop: ownerSpace.lg,
    },
    cancelEditBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: ownerRadii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ownerColors.border,
      backgroundColor: ownerColors.bgSurface,
    },
    cancelEditText: {
      color: ownerColors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    saveEditBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: ownerRadii.md,
      backgroundColor: ownerColors.gold,
    },
    saveEditBtnDisabled: {
      opacity: 0.55,
    },
    saveEditText: {
      color: '#0F0F0F',
      fontSize: 15,
      fontWeight: '800',
    },
    notesCard: {
      padding: ownerSpace.md,
    },
    notesLabel: {
      color: ownerColors.textMuted,
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      fontWeight: '700',
    },
    notesBody: {
      color: ownerColors.text,
      fontSize: 15,
      marginTop: 6,
      lineHeight: 22,
    },
    body: {
      color: ownerColors.textSecondary,
      fontSize: 14,
      paddingHorizontal: 4,
    },
  };
});
