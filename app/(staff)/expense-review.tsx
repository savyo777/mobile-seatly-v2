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
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { GlassCard } from '@/components/owner/GlassCard';
import { AiBadge } from '@/components/owner/AiBadge';
import { ScanShimmer } from '@/components/owner/ScanShimmer';
import { MonthCalendar } from '@/components/owner/MonthCalendar';
import { useExpenses } from '@/lib/context/ExpensesContext';
import { useCurrentUserId } from '@/lib/auth/currentUserId';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { getCurrentOwnerRestaurantId } from '@/lib/services/ownerRestaurant';
import { consumePendingScan, type PendingScan } from '@/lib/expenses/pendingScan';
import { scanReceipt } from '@/lib/expenses/scanReceipt';
import { uploadReceiptImage } from '@/lib/expenses/uploadReceiptImage';
import {
  EXPENSE_CATEGORIES,
  isExpenseCategoryKey,
  type ExpenseCategoryKey,
} from '@/lib/owner/expenseCategories';
import type { Expense, ExpenseDraftFieldKey } from '@/lib/expenses/types';
import { createStyles } from '@/lib/theme';
import { ownerColorsFromPalette, ownerRadii, ownerSpace, useOwnerColors } from '@/lib/theme/ownerTheme';
import { brandGold, withAlpha } from '@/lib/theme/tokens';

const PAYMENT_METHODS: { key: 'card' | 'cash' | 'other'; label: string }[] = [
  { key: 'card', label: 'Card' },
  { key: 'cash', label: 'Cash' },
  { key: 'other', label: 'Other' },
];

function centsToInputString(cents: number | null): string {
  if (cents == null) return '';
  return (cents / 100).toFixed(2);
}

function parseCurrencyInput(value: string): number | null {
  const cleaned = value.replace(/[^0-9.,-]/g, '').replace(',', '.');
  if (!cleaned) return null;
  const dollars = parseFloat(cleaned);
  if (!Number.isFinite(dollars)) return null;
  return Math.round(dollars * 100);
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
  const userId = useCurrentUserId();
  const { ownerRestaurantId, addExpense, addLocalExpense, patchExpense } = useExpenses();

  const [scan, setScan] = useState<PendingScan | null>(null);
  const [scanning, setScanning] = useState(true);
  const [extractedFields, setExtractedFields] = useState<Set<ExpenseDraftFieldKey>>(new Set());
  const [saving, setSaving] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [vendor, setVendor] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayISO());
  const [subtotal, setSubtotal] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState<ExpenseCategoryKey>('other');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'other' | null>(null);
  const [paymentLast4, setPaymentLast4] = useState('');
  const [notes, setNotes] = useState('');

  // Pull the captured image once on mount; if there isn't one (deep-link
  // edge case), bail back to the camera.
  useEffect(() => {
    const next = consumePendingScan();
    if (!next) {
      router.replace('/(staff)/expense-scan');
      return;
    }
    setScan(next);
  }, [router]);

  // Once we have the scan, kick off the AI extraction.
  useEffect(() => {
    if (!scan) return;
    let cancelled = false;
    (async () => {
      const result = await scanReceipt({
        imageBase64: scan.base64,
        imageMimeType: scan.mimeType,
      });
      if (cancelled) return;
      const draft = result.draft;
      if (draft.vendor) setVendor(draft.vendor);
      if (draft.expenseDate) setExpenseDate(draft.expenseDate);
      // Single "Subtotal" field captures the all-in amount. Prefer the AI's
      // total_cents (the bottom-line on the receipt); fall back to subtotal
      // if the model only returned the pre-tax number.
      const headlineCents = draft.totalCents ?? draft.subtotalCents;
      if (headlineCents != null) setSubtotal(centsToInputString(headlineCents));
      if (draft.currency) setCurrency(draft.currency);
      if (draft.category && isExpenseCategoryKey(draft.category)) setCategory(draft.category);
      if (draft.paymentMethod === 'card' || draft.paymentMethod === 'cash' || draft.paymentMethod === 'other') {
        setPaymentMethod(draft.paymentMethod);
      }
      if (draft.paymentMethodLast4) setPaymentLast4(draft.paymentMethodLast4);
      // Collapse the AI-extraction tracking to match the simplified form.
      const collapsed = new Set<ExpenseDraftFieldKey>();
      for (const f of result.extractedFields) {
        if (f === 'totalCents' || f === 'taxCents' || f === 'tipCents') {
          collapsed.add('subtotalCents');
        } else {
          collapsed.add(f);
        }
      }
      setExtractedFields(collapsed);
      setScanning(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [scan]);

  const clearExtracted = useCallback((field: ExpenseDraftFieldKey) => {
    setExtractedFields((prev) => {
      if (!prev.has(field)) return prev;
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  }, []);

  const headerCount = extractedFields.size;

  const handleClose = useCallback(() => {
    router.replace('/(staff)/expenses' as never);
  }, [router]);

  const handleRescan = useCallback(() => {
    router.replace('/(staff)/expense-scan');
  }, [router]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    if (!vendor.trim()) {
      Alert.alert('Missing vendor', 'Add a vendor name before saving.');
      return;
    }
    const amountCents = parseCurrencyInput(subtotal);
    if (amountCents == null || amountCents < 0) {
      Alert.alert('Missing amount', 'Enter the subtotal on the receipt.');
      return;
    }

    setSaving(true);
    try {
      // Demo mode: never write to the DB. Synthesize a local expense row
      // and push it into the context so the list reflects the save.
      if (isDemoModeEnabled()) {
        const localId = `local-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
        const localExpense: Expense = {
          id: localId,
          restaurantId: ownerRestaurantId ?? 'r1',
          createdByUserId: userId ?? 'u1',
          createdAt: new Date().toISOString(),
          vendor: vendor.trim(),
          expenseDate: expenseDate || todayISO(),
          subtotalCents: null,
          taxCents: null,
          tipCents: null,
          totalCents: amountCents,
          currency: currency.trim() || 'USD',
          category,
          paymentMethod,
          paymentMethodLast4: paymentLast4.trim() || null,
          imagePath: null,
          notes: notes.trim() || null,
          aiExtracted: extractedFields.size > 0,
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
          'We couldn’t find a restaurant linked to this account. Make sure you finished registering your restaurant.',
        );
        setSaving(false);
        return;
      }
      if (!userId) {
        Alert.alert('Not signed in', 'Sign in to save this expense.');
        setSaving(false);
        return;
      }

      const created = await addExpense({
        restaurantId,
        createdByUserId: userId,
        vendor: vendor.trim(),
        expenseDate: expenseDate || todayISO(),
        subtotalCents: null,
        taxCents: null,
        tipCents: null,
        totalCents: amountCents,
        currency: currency.trim() || 'USD',
        category,
        paymentMethod,
        paymentMethodLast4: paymentLast4.trim() || null,
        imagePath: null,
        notes: notes.trim() || null,
        aiExtracted: extractedFields.size > 0,
        aiRaw: null,
      });

      if (created && scan) {
        try {
          const path = await uploadReceiptImage({
            uri: scan.uri,
            restaurantId,
            expenseId: created.id,
            contentType: scan.mimeType,
          });
          if (path) {
            await patchExpense(created.id, { imagePath: path });
          }
        } catch {
          // image upload failed — the row is still saved. Owner can
          // re-attach the image later via the detail screen (v2).
        }
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace('/(staff)/expenses' as never);
    } catch (err) {
      Alert.alert('Couldn’t save', String((err as Error)?.message ?? err));
      setSaving(false);
    }
  }, [
    saving,
    vendor,
    subtotal,
    ownerRestaurantId,
    userId,
    addExpense,
    addLocalExpense,
    expenseDate,
    currency,
    category,
    paymentMethod,
    paymentLast4,
    notes,
    extractedFields.size,
    scan,
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
              <Text style={styles.title}>Review receipt</Text>
              {scanning ? (
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
                  <Text style={styles.previewMetaTitle}>Captured</Text>
                  <Text style={styles.previewMetaBody}>
                    {scanning
                      ? 'Cenaiva AI is extracting receipt details…'
                      : 'Edit any field below. Save when it looks right.'}
                  </Text>
                  <Pressable onPress={handleRescan} style={styles.rescanBtn}>
                    <Ionicons name="camera-outline" size={14} color={ownerColors.gold} />
                    <Text style={styles.rescanText}>Re-shoot</Text>
                  </Pressable>
                </View>
              </View>
            </GlassCard>

            {fieldLabel('Vendor', 'vendor')}
            <TextInput
              value={vendor}
              onChangeText={(v) => {
                setVendor(v);
                clearExtracted('vendor');
              }}
              placeholder="e.g. Sysco Foodservice"
              placeholderTextColor={ownerColors.textMuted}
              style={styles.input}
              autoCapitalize="words"
            />

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

            {fieldLabel('Subtotal', 'subtotalCents')}
            <TextInput
              value={subtotal}
              onChangeText={(v) => {
                setSubtotal(v);
                clearExtracted('subtotalCents');
              }}
              placeholder="0.00"
              placeholderTextColor={ownerColors.textMuted}
              style={[styles.input, styles.inputTotal]}
              keyboardType="decimal-pad"
            />

            {fieldLabel('Category', 'category')}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catChips}
            >
              {EXPENSE_CATEGORIES.map((c) => {
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

            {fieldLabel('Payment method', 'paymentMethod')}
            <View style={styles.payRow}>
              {PAYMENT_METHODS.map((p) => {
                const on = paymentMethod === p.key;
                return (
                  <Pressable
                    key={p.key}
                    onPress={() => {
                      setPaymentMethod(p.key);
                      clearExtracted('paymentMethod');
                    }}
                    style={[styles.payChip, on && styles.payChipOn]}
                  >
                    <Text style={[styles.payChipText, on && styles.payChipTextOn]}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {paymentMethod === 'card' ? (
              <>
                {fieldLabel('Card last 4', 'paymentMethodLast4')}
                <TextInput
                  value={paymentLast4}
                  onChangeText={(v) => {
                    setPaymentLast4(v.replace(/[^0-9]/g, '').slice(0, 4));
                    clearExtracted('paymentMethodLast4');
                  }}
                  placeholder="1234"
                  placeholderTextColor={ownerColors.textMuted}
                  style={styles.input}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </>
            ) : null}

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional"
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
              accessibilityLabel="Save expense"
            >
              <Ionicons name="checkmark" size={18} color="#0F0F0F" />
              <Text style={styles.bottomSaveBtnText}>{saving ? 'Saving…' : 'Save expense'}</Text>
            </Pressable>

            <View style={{ height: ownerSpace.xl + insets.bottom }} />
          </ScrollView>
        </OwnerScreen>
      </KeyboardAvoidingView>

      <MonthCalendar
        visible={datePickerOpen}
        value={expenseDate}
        title="Receipt date"
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
    payRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 6,
    },
    payChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: ownerRadii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ownerColors.border,
      backgroundColor: ownerColors.bgSurface,
    },
    payChipOn: {
      borderColor: withAlpha(brandGold.dark, 0.55),
      backgroundColor: withAlpha(brandGold.dark, 0.14),
    },
    payChipText: {
      color: ownerColors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    payChipTextOn: {
      color: ownerColors.text,
    },
  };
});
