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

function isDirectImageUri(value: string): boolean {
  return /^(file|content|data|https?):/i.test(value);
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
  const [amount, setAmount] = useState('');
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
      setSignedUrl(null);
      return;
    }
    if (isDirectImageUri(expense.receiptUrl)) {
      setSignedUrl(expense.receiptUrl);
      return;
    }
    (async () => {
      const url = await getReceiptSignedUrl(expense.receiptUrl ?? '');
      if (!cancelled) setSignedUrl(url);
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
    setAmount(dollarsToInputString(expense.amount));
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
    setAmount(dollarsToInputString(expense.amount));
    setCategory(expense.category);
    setPaymentStatus(expense.paymentStatus);
    setNotes(expense.notes ?? '');
    setPaymentMethod(expense.paymentMethod ?? '');
    setEditing(false);
  }, [expense]);

  const handleSaveEdit = useCallback(async () => {
    if (!expense || saving) return;
    if (!vendor.trim()) {
      Alert.alert(
        transactionType === 'income' ? 'Missing source' : 'Missing vendor',
        transactionType === 'income' ? 'Add a source before saving.' : 'Add a vendor before saving.',
      );
      return;
    }
    const parsedAmount = parseDollarsInput(amount);
    if (parsedAmount == null || parsedAmount < 0) {
      Alert.alert('Missing amount', 'Enter how much the entry was for.');
      return;
    }
    const totalAmount = parsedAmount;
    const paidAt = paymentStatus === 'paid' ? (expense.paidAt ?? new Date().toISOString()) : null;

    setSaving(true);
    try {
      const patch = {
        vendorName: vendor.trim(),
        description: description.trim() || null,
        expenseDate,
        amount: parsedAmount,
        taxAmount: null as number | null,
        totalAmount,
        category,
        paymentStatus,
        paidAt,
        transactionType,
        notes: notes.trim() || null,
        paymentMethod: paymentMethod.trim() || null,
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
      Alert.alert('Couldn’t save changes', String((err as Error)?.message ?? err));
    } finally {
      setSaving(false);
    }
  }, [
    expense,
    saving,
    vendor,
    transactionType,
    amount,
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
              amount={amount}
              setAmount={setAmount}
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
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(expense.totalAmount, expense.currency)}
            </Text>
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
  amount,
  setAmount,
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
  amount: string;
  setAmount: (value: string) => void;
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
        onChangeText={setVendor}
        placeholder={transactionType === 'income' ? 'DoorDash, event tickets, catering client' : 'Toronto Hydro'}
        placeholderTextColor={ownerColors.textMuted}
        style={styles.input}
      />

      <Text style={styles.fieldLabel}>Amount</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
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
        onChangeText={setDescription}
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
        onChangeText={setPaymentMethod}
        placeholder="Visa ****4242, cash, interac"
        placeholderTextColor={ownerColors.textMuted}
        style={styles.input}
        autoCapitalize="none"
      />

      <Text style={styles.fieldLabel}>Notes</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
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
