import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { Expense } from '@/lib/expenses/types';
import { getExpenseCategory, getExpenseCategoryLabel } from '@/lib/owner/expenseCategories';
import { getReceiptSignedUrl } from '@/lib/expenses/uploadReceiptImage';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { useOwnerColors } from '@/lib/theme/ownerTheme';
import { brandGold, withAlpha } from '@/lib/theme/tokens';

type Props = {
  expense: Expense;
  onPress: () => void;
};

export function ExpenseListRow({ expense, onPress }: Props) {
  const ownerColors = useOwnerColors();
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!expense.imagePath) {
      setThumbUrl(null);
      return;
    }
    (async () => {
      const url = await getReceiptSignedUrl(expense.imagePath ?? '', 60 * 30);
      if (!cancelled) setThumbUrl(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [expense.imagePath]);

  const cat = getExpenseCategory(expense.category);
  const label = getExpenseCategoryLabel(expense.category);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: withAlpha(brandGold.dark, 0.08) },
        pressed && styles.rowPressed,
      ]}
    >
      <View style={[styles.thumb, { backgroundColor: ownerColors.bgElevated }]}>
        {thumbUrl ? (
          <Image source={{ uri: thumbUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        ) : (
          <Ionicons name="receipt-outline" size={18} color={ownerColors.textMuted} />
        )}
      </View>

      <View style={styles.middle}>
        <Text style={[styles.vendor, { color: ownerColors.text }]} numberOfLines={1}>
          {expense.vendor}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.date, { color: ownerColors.textMuted }]}>{expense.expenseDate}</Text>
          <View
            style={[
              styles.chip,
              {
                borderColor: withAlpha(brandGold.dark, 0.32),
                backgroundColor: withAlpha(brandGold.dark, 0.1),
              },
            ]}
          >
            <Text style={[styles.chipGlyph, { color: ownerColors.gold }]}>{cat?.glyph ?? '·'}</Text>
            <Text style={[styles.chipText, { color: ownerColors.text }]}>{label}</Text>
          </View>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={[styles.amount, { color: ownerColors.gold }]}>
          {formatCurrency(expense.totalCents / 100, expense.currency)}
        </Text>
        {expense.aiExtracted ? (
          <Text style={[styles.aiHint, { color: ownerColors.gold }]}>✨</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowPressed: {
    opacity: 0.72,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  vendor: {
    fontSize: 15,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  date: {
    fontSize: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipGlyph: {
    fontSize: 11,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
    minWidth: 80,
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  aiHint: {
    fontSize: 11,
    opacity: 0.85,
  },
});
