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
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { GlassCard } from '@/components/owner/GlassCard';
import { AiBadge } from '@/components/owner/AiBadge';
import { ScanShimmer } from '@/components/owner/ScanShimmer';
import { MonthCalendar } from '@/components/owner/MonthCalendar';
import { useExpenses } from '@/lib/context/ExpensesContext';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { getCurrentOwnerRestaurantId } from '@/lib/services/ownerRestaurant';
import { consumePendingScan, type PendingScan } from '@/lib/expenses/pendingScan';
import { scanReceipt } from '@/lib/expenses/scanReceipt';
import { uploadReceiptImage } from '@/lib/expenses/uploadReceiptImage';
import { rememberReceiptPreview, rememberReceiptStoragePath } from '@/lib/expenses/receiptPreviewCache';
import { convertCurrency, type ConvertCurrencySuccess } from '@/lib/expenses/convertCurrency';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { getCurrentUserProfileId } from '@/lib/expenses/expensesApi';
import { friendlyError } from '@/lib/errors/friendlyError';
import {
  EXPENSE_CATEGORIES,
  isExpenseCategoryKey,
  type ExpenseCategoryKey,
} from '@/lib/owner/expenseCategories';
import type {
  Expense,
  ExpenseDraftFieldKey,
  PaymentStatus,
  TransactionType,
} from '@/lib/expenses/types';
import { createStyles } from '@/lib/theme';
import { ownerColorsFromPalette, ownerRadii, ownerSpace, useOwnerColors } from '@/lib/theme/ownerTheme';
import { brandGold, withAlpha } from '@/lib/theme/tokens';
import { normalizeTextInput, sanitizeMoneyInput, sanitizeTextInput } from '@/lib/validation/input';

const TRANSACTION_TYPE_OPTIONS: Array<{ value: TransactionType; label: string }> = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
];

const WEB_EXPENSE_CATEGORY_KEYS: ExpenseCategoryKey[] = [
  'food_cost',
  'food_supplies',
  'beverages',
  'utilities',
  'rent',
  'equipment',
  'marketing',
  'staff',
  'supplies',
  'maintenance',
  'cleaning',
  'other',
];

const WEB_INCOME_CATEGORY_KEYS: ExpenseCategoryKey[] = [
  'sales',
  'preorders',
  'events',
  'catering',
  'delivery',
  'gift_cards',
  'other',
];

const STATUS_OPTIONS: Array<{ value: PaymentStatus; label: string }> = [
  { value: 'paid', label: 'Paid' },
  { value: 'due', label: 'Due' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'overdue', label: 'Overdue' },
];

function dollarsToInputString(amount: number | null): string {
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

function statusLabel(status: PaymentStatus, type: TransactionType): string {
  if (type === 'income') {
    switch (status) {
      case 'due':
        return 'Expected';
      case 'scheduled':
        return 'Scheduled';
      case 'overdue':
        return 'Overdue';
      default:
        return 'Received';
    }
  }
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? 'Paid';
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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

export default function ExpenseReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ownerColors = useOwnerColors();
  const styles = useStyles();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isManual = params.mode === 'manual';
  const { ownerRestaurantId, ownerRestaurantCurrency, addExpense, addLocalExpense, patchExpense } = useExpenses();

  const [scan, setScan] = useState<PendingScan | null>(null);
  // Manual mode skips the AI extraction entirely, so the form starts
  // editable immediately (no shimmer).
  const [scanning, setScanning] = useState(!isManual);
  const [extractedFields, setExtractedFields] = useState<Set<ExpenseDraftFieldKey>>(new Set());
  const [saving, setSaving] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [vendor, setVendor] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayISO());
  const [subtotal, setSubtotal] = useState(isManual ? '0' : '');
  const [taxAmount, setTaxAmount] = useState('');
  const [totalAmount, setTotalAmount] = useState(isManual ? '0' : '');
  // True once the owner types directly into the Total field. After that,
  // editing Subtotal or Tax stops auto-updating Total — the owner's value
  // is treated as source-of-truth (covers penny rounding on real receipts).
  const [totalManuallyEdited, setTotalManuallyEdited] = useState(false);
  const [currency, setCurrency] = useState('cad');
  const [category, setCategory] = useState<ExpenseCategoryKey>('food_cost');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  // Currency-conversion state. Populated when the receipt was in a
  // different currency from the restaurant and we successfully converted
  // it; cleared when the user edits the amount or starts a fresh scan.
  const [conversion, setConversion] = useState<ConvertCurrencySuccess | null>(null);
  const [converting, setConverting] = useState(false);
  const [conversionFailed, setConversionFailed] = useState<string | null>(null);

  // This screen lives inside the (staff) tab navigator, so its component
  // instance is reused between visits — `useState` initial values do NOT
  // reset on subsequent navigations. Reset every form field on each
  // focus so a fresh "Track expense" never inherits the previous
  // session's vendor / amount / saving=true state. Pending-scan
  // consumption also moves here so each capture visit picks up the new
  // scan; manual mode just lands on a clean blank form.
  useFocusEffect(
    useCallback(() => {
      setScan(null);
      setScanning(!isManual);
      setExtractedFields(new Set());
      setSaving(false);
      setDatePickerOpen(false);
      setTransactionType('expense');
      setVendor('');
      setDescription('');
      setExpenseDate(todayISO());
      setSubtotal(isManual ? '0' : '');
      setTaxAmount('');
      setTotalAmount(isManual ? '0' : '');
      setTotalManuallyEdited(false);
      setCurrency('cad');
      setCategory('food_cost');
      setPaymentStatus('paid');
      setNotes('');
      setPaymentMethod('');
      setConversion(null);
      setConverting(false);
      setConversionFailed(null);

      if (isManual) return;
      const next = consumePendingScan();
      if (!next) {
        router.replace('/(staff)/expenses' as never);
        return;
      }
      setScan(next);
    }, [isManual, router]),
  );

  // Once we have the scan, kick off the AI extraction. The finally block is
  // critical: scanReceipt can throw or hang (network failure, missing edge
  // function deploy, etc.), and without an unconditional setScanning(false)
  // the form would be stuck on the loading shimmer forever.
  useEffect(() => {
    if (!scan) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await scanReceipt({
          imageBase64: scan.base64,
          imageMimeType: scan.mimeType,
        });
        if (cancelled) return;
        const draft = result.draft;
        if (draft.vendor) setVendor(draft.vendor);
        if (draft.expenseDate) setExpenseDate(draft.expenseDate);

        // Seed the money trio from the AI. Two rules keep the Subtotal
        // field from confusing the owner:
        //   1. Only fill Subtotal when the AI extracted a real breakdown
        //      (tax_amount is non-null). Receipts with just a single total
        //      line should show that total in Total only — putting it in
        //      Subtotal too is misleading.
        //   2. Lock Total (via totalManuallyEdited) the moment AI sets it,
        //      so a later edit to Subtotal/Tax doesn't overwrite the
        //      verified bottom-line via smart auto-fill.
        const aiSubtotal = draft.amount;
        const aiTax = draft.taxAmount;
        const aiTotal = draft.totalAmount;
        const headlineAmount = aiTotal ?? aiSubtotal;
        const hasRealBreakdown = aiTax != null;
        const detectedCurrency = draft.currency ? draft.currency.toLowerCase() : null;
        if (hasRealBreakdown && aiSubtotal != null) {
          setSubtotal(dollarsToInputString(aiSubtotal));
        }
        if (aiTax != null) setTaxAmount(dollarsToInputString(aiTax));
        if (aiTotal != null) {
          setTotalAmount(dollarsToInputString(aiTotal));
          setTotalManuallyEdited(true);
        } else if (aiSubtotal != null) {
          // No total on the receipt — derive it.
          setTotalAmount(dollarsToInputString(aiSubtotal + (aiTax ?? 0)));
          setTotalManuallyEdited(true);
        }

        if (detectedCurrency) setCurrency(detectedCurrency);
        if (draft.category && isExpenseCategoryKey(draft.category)) setCategory(draft.category);
        if (draft.paymentMethod) setPaymentMethod(draft.paymentMethod);
        setExtractedFields(new Set<ExpenseDraftFieldKey>(result.extractedFields));

        // FX conversion: if the receipt is in a currency other than the
        // restaurant's currency, convert before the owner saves. We do ONE
        // conversion call (using the total as the reference amount) and
        // then apply the same rate to subtotal and tax — keeps the trio
        // mathematically consistent and avoids three round-trips.
        const targetCurrency = ownerRestaurantCurrency;
        if (
          targetCurrency &&
          detectedCurrency &&
          detectedCurrency !== targetCurrency &&
          headlineAmount != null &&
          headlineAmount > 0
        ) {
          setConverting(true);
          setConversionFailed(null);
          const conv = await convertCurrency({
            amount: headlineAmount,
            from: detectedCurrency,
            to: targetCurrency,
            date: draft.expenseDate ?? null,
          });
          if (cancelled) return;
          if (conv.ok) {
            setConversion(conv);
            const rate = conv.rate;
            if (hasRealBreakdown && aiSubtotal != null) setSubtotal(dollarsToInputString(aiSubtotal * rate));
            if (aiTax != null) setTaxAmount(dollarsToInputString(aiTax * rate));
            if (aiTotal != null) {
              setTotalAmount(dollarsToInputString(conv.convertedAmount));
              setTotalManuallyEdited(true);
            } else if (aiSubtotal != null) {
              setTotalAmount(dollarsToInputString((aiSubtotal + (aiTax ?? 0)) * rate));
              setTotalManuallyEdited(true);
            }
            setCurrency(conv.targetCurrency);
          } else if (conv.reason !== 'same_currency') {
            setConversionFailed(conv.reason);
          }
          setConverting(false);
        }
      } catch (err) {
        // scanReceipt failed — surface nothing prefilled, let the owner
        // type the receipt in manually instead of being stuck.
        if (__DEV__) console.warn('scanReceipt failed', err);
      } finally {
        if (!cancelled) setScanning(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scan, ownerRestaurantCurrency]);

  const clearExtracted = useCallback((field: ExpenseDraftFieldKey) => {
    setExtractedFields((prev) => {
      if (!prev.has(field)) return prev;
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  }, []);

  const headerCount = extractedFields.size;
  const activeCategoryKeys = useMemo(
    () => transactionType === 'income'
      ? WEB_INCOME_CATEGORY_KEYS
      : (isManual ? WEB_EXPENSE_CATEGORY_KEYS : EXPENSE_CATEGORIES.map((c) => c.key)),
    [isManual, transactionType],
  );
  const activeCategories = useMemo(
    () => activeCategoryKeys
      .map((key) => EXPENSE_CATEGORIES.find((c) => c.key === key))
      .filter((c): c is (typeof EXPENSE_CATEGORIES)[number] => Boolean(c)),
    [activeCategoryKeys],
  );

  useEffect(() => {
    if (activeCategoryKeys.includes(category)) return;
    setCategory(activeCategoryKeys[0] ?? 'other');
  }, [activeCategoryKeys, category]);

  const handleClose = useCallback(() => {
    router.replace('/(staff)/expenses' as never);
  }, [router]);

  const handleRescan = useCallback(() => {
    router.replace('/(staff)/expense-scan');
  }, [router]);

  // Title/subtitle shown in the header. Manual mode advertises a fresh
  // form; attachment mode still talks about reading the receipt because
  // the AI extractor is running underneath.
  const headerTitle = isManual ? 'Log expense or income' : 'Review receipt';

  const handleSave = useCallback(async () => {
    if (saving) return;
    if (!vendor.trim()) {
      Alert.alert(
        transactionType === 'income' ? 'Missing source' : 'Missing vendor',
        friendlyError(undefined, transactionType === 'income' ? 'Add a source before saving.' : 'Add a vendor name before saving.'),
      );
      return;
    }
    // Total is the source-of-truth for "amount paid". Subtotal and tax are
    // optional — when only total is provided, subtotal mirrors it and tax
    // stays null (matches single-line receipts without a tax breakdown).
    const totalNum = parseDollarsInput(totalAmount);
    if (totalNum == null || totalNum < 0) {
      Alert.alert('Missing total', friendlyError(undefined, 'Enter the total amount paid before saving.'));
      return;
    }
    const subtotalNum = parseDollarsInput(subtotal);
    const taxNum = parseDollarsInput(taxAmount);
    const amount = subtotalNum != null && subtotalNum >= 0 ? subtotalNum : totalNum;
    const taxToPersist = taxNum != null && taxNum > 0 ? taxNum : null;
    const paidAt = isManual && paymentStatus === 'paid' ? new Date().toISOString() : null;

    // Build the structured AI-extracted blob the rest of the app reads
    // from `expenses.ai_extracted_data`. When the receipt was converted
    // from another currency we record the originals + rate + provider so
    // the detail screen can show "Converted from X at rate Y". The
    // converted-total in the blob references totalNum so the detail
    // screen's original-amount math matches what we just saved.
    const aiExtractedData: Record<string, unknown> | null = conversion
      ? {
          conversion: {
            originalAmount: Math.round((totalNum / conversion.rate) * 100) / 100,
            originalCurrency: conversion.sourceCurrency,
            convertedAmount: totalNum,
            convertedCurrency: conversion.targetCurrency,
            rate: conversion.rate,
            provider: conversion.provider,
            quotedAt: conversion.quotedAt,
          },
        }
      : null;

    setSaving(true);
    try {
      // Demo mode: never write to the DB. Synthesize a local expense row
      // and push it into the context so the list reflects the save.
      if (isDemoModeEnabled()) {
        const localId = `local-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
        const localExpense: Expense = {
          id: localId,
          restaurantId: ownerRestaurantId ?? 'r1',
          createdBy: 'u1',
          createdAt: new Date().toISOString(),
          vendorName: normalizeTextInput(vendor, { maxLength: 120 }),
          description: normalizeTextInput(description, { maxLength: 500 }) || null,
          expenseDate: expenseDate || todayISO(),
          amount,
          taxAmount: taxToPersist,
          totalAmount: totalNum,
          currency: (currency || 'cad').toLowerCase(),
          category,
          paymentStatus,
          paidAt,
          transactionType,
          receiptUrl: scan?.uri ?? null,
          receiptType: scan ? 'image' : null,
          aiCategorized: extractedFields.size > 0,
          aiExtractedData,
          notes: normalizeTextInput(notes, { maxLength: 1000, multiline: true }) || null,
          paymentMethod: normalizeTextInput(paymentMethod, { maxLength: 80 }) || null,
        };
        addLocalExpense(localExpense);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        router.replace('/(staff)/expenses' as never);
        return;
      }

      // Real mode: prefer the context's restaurant id, fall back to a
      // direct lookup so we don't fail just because the context hasn't
      // hydrated yet.
      let restaurantId = ownerRestaurantId;
      if (!restaurantId) {
        try {
          restaurantId = await getCurrentOwnerRestaurantId();
        } catch {
          restaurantId = null;
        }
      }
      if (!restaurantId) {
        Alert.alert(
          'No restaurant linked',
          friendlyError(undefined, 'We couldn’t find a restaurant linked to this account. Make sure you finished registering your restaurant.'),
        );
        setSaving(false);
        return;
      }

      // public.expenses.created_by FKs to user_profiles.id, NOT auth.users.id.
      const profileId = await getCurrentUserProfileId();
      if (!profileId) {
        Alert.alert('Profile missing', friendlyError(undefined, 'We couldn’t resolve your user profile. Sign out and back in, then try again.'));
        setSaving(false);
        return;
      }

      const created = await addExpense({
        restaurantId,
        createdBy: profileId,
        vendorName: normalizeTextInput(vendor, { maxLength: 120 }),
        description: normalizeTextInput(description, { maxLength: 500 }) || null,
        expenseDate: expenseDate || todayISO(),
        amount,
        taxAmount: taxToPersist,
        totalAmount: totalNum,
        currency: (currency || 'cad').toLowerCase(),
        category,
        paymentStatus,
        paidAt,
        transactionType,
        receiptUrl: null,
        receiptType: scan ? 'image' : null,
        notes: normalizeTextInput(notes, { maxLength: 1000, multiline: true }) || null,
        paymentMethod: normalizeTextInput(paymentMethod, { maxLength: 80 }) || null,
        aiCategorized: extractedFields.size > 0,
        aiExtractedData,
      });

      if (created && scan) {
        rememberReceiptPreview(created.id, scan.uri);
        try {
          const path = await uploadReceiptImage({
            uri: scan.uri,
            restaurantId,
            expenseId: created.id,
            contentType: scan.mimeType,
          });
          if (path) {
            rememberReceiptStoragePath(created.id, path);
            await patchExpense(created.id, { receiptUrl: path, receiptType: 'image' });
          } else {
            addLocalExpense({ ...created, receiptUrl: scan.uri, receiptType: 'image' });
          }
        } catch {
          // Keep the just-submitted receipt visible in this session even if
          // storage attachment fails, so the detail screen still shows the
          // photo/file the owner used to create the expense.
          addLocalExpense({ ...created, receiptUrl: scan.uri, receiptType: 'image' });
        }
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace('/(staff)/expenses' as never);
    } catch (err) {
      Alert.alert('Couldn’t save', friendlyError(err, "Couldn’t save the receipt. Please try again."));
      setSaving(false);
    }
  }, [
    saving,
    vendor,
    subtotal,
    taxAmount,
    totalAmount,
    isManual,
    paymentStatus,
    transactionType,
    description,
    ownerRestaurantId,
    addExpense,
    addLocalExpense,
    expenseDate,
    currency,
    category,
    notes,
    paymentMethod,
    extractedFields.size,
    scan,
    conversion,
    patchExpense,
    router,
  ]);

  const fieldLabel = useCallback(
    (label: string, field: ExpenseDraftFieldKey) => (
      <View style={styles.labelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <AiBadge extracted={extractedFields.has(field)} />
      </View>
    ),
    [extractedFields, styles.fieldLabel, styles.labelRow],
  );

  const previewSource = useMemo(() => (scan ? { uri: scan.uri } : null), [scan]);

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <OwnerScreen contentContainerStyle={styles.scrollPad}>
          <Animated.View entering={FadeInDown.duration(220)} style={styles.headRow}>
            <Pressable onPress={handleClose} hitSlop={10} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={26} color={ownerColors.gold} />
            </Pressable>
            <View style={styles.headText}>
              <Text style={styles.title}>{headerTitle}</Text>
              {isManual ? (
                <Text style={styles.subtitle}>
                  Save actual money in or out, and optionally create a recurring rule for forecasting.
                </Text>
              ) : scanning ? (
                <Text style={styles.subtitle}>Reading your receipt…</Text>
              ) : headerCount > 0 ? (
                <Text style={styles.subtitle}>
                  AI filled {headerCount} field{headerCount === 1 ? '' : 's'}. Review and save.
                </Text>
              ) : (
                <Text style={styles.subtitle}>Couldn't read the receipt. Fill in the details below.</Text>
              )}
            </View>
            <View style={styles.headRight} />
          </Animated.View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {!isManual ? (
              <GlassCard style={styles.previewCard}>
                <View style={styles.previewRow}>
                  {previewSource ? (
                    <View style={styles.previewImageWrap}>
                      <Image source={previewSource} style={styles.previewImage} contentFit="cover" />
                      <ScanShimmer active={scanning} />
                    </View>
                  ) : (
                    <View style={styles.previewImageWrap} />
                  )}
                  <View style={styles.previewMeta}>
                    <Text style={styles.previewMetaTitle}>
                      {scan?.source === 'file' ? 'Uploaded' : 'Captured'}
                    </Text>
                    <Text style={styles.previewMetaBody}>
                      {scanning
                        ? 'Cenaiva AI is extracting receipt details…'
                        : 'Edit any field below. Save when it looks right.'}
                    </Text>
                    {scan?.source === 'file' ? null : (
                      <Pressable onPress={handleRescan} style={styles.rescanBtn}>
                        <Ionicons name="camera-outline" size={14} color={ownerColors.gold} />
                        <Text style={styles.rescanText}>Re-shoot</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </GlassCard>
            ) : null}

            {isManual ? (
              <>
                <Text style={styles.fieldLabel}>Type</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.catChips}
                >
                  {TRANSACTION_TYPE_OPTIONS.map((option) => {
                    const on = option.value === transactionType;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => setTransactionType(option.value)}
                        style={[styles.catChip, on && styles.catChipOn]}
                      >
                        <Text style={[styles.catChipText, on && styles.catChipTextOn]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}

            {fieldLabel(transactionType === 'income' ? 'Source' : 'Vendor', 'vendor')}
            <TextInput
              value={vendor}
              onChangeText={(v) => {
                setVendor(sanitizeTextInput(v, { maxLength: 120 }));
                clearExtracted('vendor');
              }}
              placeholder={transactionType === 'income' ? 'DoorDash, event tickets, catering client' : 'Toronto Hydro'}
              placeholderTextColor={ownerColors.textMuted}
              style={styles.input}
              autoCapitalize="words"
            />

            {fieldLabel('Subtotal (before tax)', 'amount')}
            <TextInput
              value={subtotal}
              onChangeText={(v) => {
                const sanitized = sanitizeMoneyInput(v);
                setSubtotal(sanitized);
                clearExtracted('amount');
                // Smart auto-fill: keep Total in sync with Subtotal + Tax
                // until the owner manually edits the Total field.
                if (!totalManuallyEdited) {
                  const s = parseDollarsInput(sanitized) ?? 0;
                  const t = parseDollarsInput(taxAmount) ?? 0;
                  setTotalAmount(dollarsToInputString(s + t));
                }
                // Manual edits invalidate the auto-conversion banner: the
                // owner has overridden the converted value.
                if (conversion) setConversion(null);
                if (conversionFailed) setConversionFailed(null);
              }}
              placeholder="0.00"
              placeholderTextColor={ownerColors.textMuted}
              style={styles.input}
              keyboardType="decimal-pad"
            />

            {fieldLabel('Tax', 'taxAmount')}
            <TextInput
              value={taxAmount}
              onChangeText={(v) => {
                const sanitized = sanitizeMoneyInput(v);
                setTaxAmount(sanitized);
                clearExtracted('taxAmount');
                if (!totalManuallyEdited) {
                  const s = parseDollarsInput(subtotal) ?? 0;
                  const t = parseDollarsInput(sanitized) ?? 0;
                  setTotalAmount(dollarsToInputString(s + t));
                }
                if (conversion) setConversion(null);
                if (conversionFailed) setConversionFailed(null);
              }}
              placeholder="0.00"
              placeholderTextColor={ownerColors.textMuted}
              style={styles.input}
              keyboardType="decimal-pad"
            />

            {fieldLabel('Total', 'totalAmount')}
            <TextInput
              value={totalAmount}
              onChangeText={(v) => {
                setTotalAmount(sanitizeMoneyInput(v));
                setTotalManuallyEdited(true);
                clearExtracted('totalAmount');
                if (conversion) setConversion(null);
                if (conversionFailed) setConversionFailed(null);
              }}
              placeholder="0.00"
              placeholderTextColor={ownerColors.textMuted}
              style={[styles.input, styles.inputTotal]}
              keyboardType="decimal-pad"
            />
            {converting ? (
              <Text style={styles.conversionHint}>Converting to {(ownerRestaurantCurrency ?? '').toUpperCase()}…</Text>
            ) : conversion ? (
              <Text style={styles.conversionHint}>
                Converted from {formatCurrency(
                  Math.round((conversion.convertedAmount / conversion.rate) * 100) / 100,
                  conversion.sourceCurrency,
                )} at 1 {conversion.sourceCurrency.toUpperCase()} = {conversion.rate.toFixed(4)} {conversion.targetCurrency.toUpperCase()}
              </Text>
            ) : conversionFailed ? (
              <Text style={styles.conversionWarning}>
                Couldn’t fetch an exchange rate. Confirm the amount in {(ownerRestaurantCurrency ?? '').toUpperCase()} before saving.
              </Text>
            ) : null}

            {fieldLabel('Category', 'category')}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catChips}
            >
              {activeCategories.map((c) => {
                const on = c.key === category;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => {
                      setCategory(c.key);
                      clearExtracted('category');
                    }}
                    style={[styles.catChip, on && styles.catChipOn]}
                  >
                    <Text style={[styles.catGlyph, on && styles.catGlyphOn]}>{c.glyph}</Text>
                    <Text style={[styles.catChipText, on && styles.catChipTextOn]}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {isManual ? (
              <>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  value={description}
                  onChangeText={(value) => setDescription(sanitizeTextInput(value, { maxLength: 500 }))}
                  placeholder={
                    transactionType === 'income'
                      ? 'Weekend pre-orders, private event deposit, catering invoice...'
                      : 'May rent, weekly produce, annual insurance...'
                  }
                  placeholderTextColor={ownerColors.textMuted}
                  style={styles.input}
                />
              </>
            ) : null}

            {fieldLabel('Date', 'expenseDate')}
            <Pressable
              onPress={() => setDatePickerOpen(true)}
              style={({ pressed }) => [
                styles.input,
                styles.dateInput,
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Date: ${formatHumanDate(expenseDate)}`}
            >
              <Text style={styles.dateInputText}>
                {formatHumanDate(expenseDate || todayISO())}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={ownerColors.gold} />
            </Pressable>

            {isManual ? (
              <>
                <Text style={styles.fieldLabel}>Status</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.catChips}
                >
                  {STATUS_OPTIONS.map((option) => {
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

              </>
            ) : null}

            {fieldLabel('Payment method (optional)', 'paymentMethod')}
            <TextInput
              value={paymentMethod}
              onChangeText={(v) => {
                setPaymentMethod(sanitizeTextInput(v, { maxLength: 80 }));
                clearExtracted('paymentMethod');
              }}
              placeholder="Visa ****4242, cash, interac"
              placeholderTextColor={ownerColors.textMuted}
              style={styles.input}
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={(value) => setNotes(sanitizeTextInput(value, { maxLength: 1000, multiline: true }))}
              placeholder={isManual ? 'Internal notes for your team or accountant.' : 'Optional'}
              placeholderTextColor={ownerColors.textMuted}
              style={[styles.input, styles.inputMultiline]}
              multiline
            />

            <Pressable
              onPress={handleSave}
              disabled={saving || scanning}
              style={({ pressed }) => [
                styles.bottomSaveBtn,
                (saving || scanning) && styles.bottomSaveBtnDisabled,
                pressed && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={isManual ? 'Save entry' : 'Save expense'}
            >
              <Ionicons name="checkmark" size={18} color="#0F0F0F" />
              <Text style={styles.bottomSaveBtnText}>
                {saving ? 'Saving…' : isManual ? 'Save entry' : 'Save expense'}
              </Text>
            </Pressable>

            <View style={{ height: ownerSpace.xl + insets.bottom }} />
          </ScrollView>
        </OwnerScreen>
      </KeyboardAvoidingView>

      <MonthCalendar
        visible={datePickerOpen}
        value={expenseDate}
        title={isManual ? 'Expense date' : 'Receipt date'}
        onClose={() => setDatePickerOpen(false)}
        onConfirm={(iso) => {
          setExpenseDate(iso);
          clearExtracted('expenseDate');
          setDatePickerOpen(false);
        }}
      />
    </View>
  );
}

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
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    subtitle: {
      color: ownerColors.textMuted,
      fontSize: 13,
      marginTop: 2,
    },
    headRight: {
      width: 16,
    },
    btnPressed: {
      opacity: 0.85,
    },
    bottomSaveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderRadius: 16,
      backgroundColor: ownerColors.gold,
      marginTop: ownerSpace.lg,
    },
    bottomSaveBtnDisabled: {
      opacity: 0.55,
    },
    bottomSaveBtnText: {
      color: '#0F0F0F',
      fontWeight: '800',
      fontSize: 16,
      letterSpacing: -0.2,
    },
    dateInput: {
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
    previewCard: {
      padding: ownerSpace.md,
      marginBottom: ownerSpace.md,
    },
    previewRow: {
      flexDirection: 'row',
      gap: ownerSpace.md,
    },
    previewImageWrap: {
      width: 96,
      height: 132,
      borderRadius: ownerRadii.md,
      backgroundColor: ownerColors.bgElevated,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: withAlpha(brandGold.dark, 0.2),
    },
    previewImage: {
      width: '100%',
      height: '100%',
    },
    previewMeta: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'space-between',
    },
    previewMetaTitle: {
      color: ownerColors.text,
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    previewMetaBody: {
      color: ownerColors.textSecondary,
      fontSize: 13,
      marginTop: 4,
      lineHeight: 18,
    },
    rescanBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      alignSelf: 'flex-start',
    },
    rescanText: {
      color: ownerColors.gold,
      fontSize: 12,
      fontWeight: '600',
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: ownerSpace.md,
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
    conversionHint: {
      marginTop: 6,
      color: ownerColors.textMuted,
      fontSize: 12,
      lineHeight: 16,
    },
    conversionWarning: {
      marginTop: 6,
      color: ownerColors.danger,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600',
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
  };
});
