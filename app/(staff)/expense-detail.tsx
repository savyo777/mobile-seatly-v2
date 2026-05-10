import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { GlassCard } from '@/components/owner/GlassCard';
import { useExpenses } from '@/lib/context/ExpensesContext';
import { getReceiptSignedUrl } from '@/lib/expenses/uploadReceiptImage';
import { getExpenseCategoryLabel } from '@/lib/owner/expenseCategories';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { createStyles } from '@/lib/theme';
import { ownerColorsFromPalette, ownerRadii, ownerSpace, useOwnerColors } from '@/lib/theme/ownerTheme';
import { brandGold, withAlpha } from '@/lib/theme/tokens';

export default function ExpenseDetailScreen() {
  const router = useRouter();
  const ownerColors = useOwnerColors();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { expenses, removeExpense } = useExpenses();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

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
    (async () => {
      const url = await getReceiptSignedUrl(expense.receiptUrl ?? '');
      if (!cancelled) setSignedUrl(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [expense?.receiptUrl]);

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
      <OwnerScreen contentContainerStyle={styles.scrollPad}>
        <Animated.View entering={FadeInDown.duration(220)} style={styles.headRow}>
          <Pressable onPress={handleClose} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={ownerColors.gold} />
          </Pressable>
          <View style={styles.headText}>
            <Text style={styles.title}>{expense.vendorName ?? '—'}</Text>
            <Text style={styles.subtitle}>
              {expense.expenseDate} · {getExpenseCategoryLabel(expense.category)}
            </Text>
          </View>
          <Pressable onPress={handleDelete} hitSlop={10} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={20} color={ownerColors.danger} />
          </Pressable>
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false}>
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

          <GlassCard variant="secondary" style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(expense.totalAmount, expense.currency)}
            </Text>
            {expense.aiCategorized ? <Text style={styles.totalAiHint}>✨ AI extracted</Text> : null}
          </GlassCard>

          <View style={styles.detailGrid}>
            <DetailRow label="Subtotal" value={formatCurrency(expense.amount, expense.currency)} />
            <DetailRow
              label="Tax"
              value={expense.taxAmount != null ? formatCurrency(expense.taxAmount, expense.currency) : '—'}
              muted={expense.taxAmount == null}
            />
            <DetailRow label="Status" value={capitalize(expense.paymentStatus)} />
            <DetailRow label="Currency" value={expense.currency.toUpperCase()} />
          </View>

          {expense.notes ? (
            <GlassCard style={styles.notesCard}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesBody}>{expense.notes}</Text>
            </GlassCard>
          ) : null}

          <View style={{ height: ownerSpace.xl }} />
        </ScrollView>
      </OwnerScreen>
    </View>
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
