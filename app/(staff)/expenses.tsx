import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { ExpenseSummaryCard } from '@/components/owner/ExpenseSummaryCard';
import { ExpenseListRow } from '@/components/owner/ExpenseListRow';
import { useExpenses } from '@/lib/context/ExpensesContext';
import { createStyles } from '@/lib/theme';
import { ownerColorsFromPalette, ownerSpace, useOwnerColors } from '@/lib/theme/ownerTheme';
import { brandGold } from '@/lib/theme/tokens';

export default function OwnerExpensesScreen() {
  const router = useRouter();
  const ownerColors = useOwnerColors();
  const styles = useStyles();
  const { expenses, loading } = useExpenses();

  const handleScan = useCallback(() => {
    router.push('/(staff)/expense-scan');
  }, [router]);

  const handleOpenDetail = useCallback(
    (id: string) => {
      router.push({ pathname: '/(staff)/expense-detail', params: { id } });
    },
    [router],
  );

  return (
    <OwnerScreen
      header={
        <View style={styles.tabHeader}>
          <Text style={styles.tabHeaderKicker}>RECEIPTS</Text>
          <Text style={styles.tabHeaderTitle}>Expenses</Text>
          <Text style={styles.tabHeaderSubtitle}>Scan a receipt — Cenaiva extracts the rest.</Text>
        </View>
      }
    >
      <View style={styles.scanCtaWrap}>
        <Pressable
          style={({ pressed }) => [styles.scanCta, pressed && styles.scanCtaPressed]}
          onPress={handleScan}
          accessibilityRole="button"
          accessibilityLabel="Scan a receipt"
        >
          <View style={styles.scanCtaIcon}>
            <Ionicons name="scan" size={18} color="#0F0F0F" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.scanCtaTitle}>Scan receipt</Text>
            <Text style={styles.scanCtaBody}>Snap any paper receipt — vendor, total, and category fill automatically.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#0F0F0F" />
        </Pressable>
      </View>

      <ExpenseSummaryCard expenses={expenses} />

      {expenses.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { borderColor: ownerColors.border }]}>
            <Ionicons name="receipt-outline" size={28} color={ownerColors.textMuted} />
          </View>
          <Text style={[styles.emptyHeadline, { color: ownerColors.text }]}>No receipts yet.</Text>
          <Text style={[styles.emptyBody, { color: ownerColors.textMuted }]}>
            Scan your first.
          </Text>
        </View>
      ) : (
        <View style={styles.listWrap}>
          {expenses.map((exp, i) => (
            <Animated.View key={exp.id} entering={FadeInDown.delay(i * 35).duration(280)}>
              <ExpenseListRow expense={exp} onPress={() => handleOpenDetail(exp.id)} />
            </Animated.View>
          ))}
        </View>
      )}

      {loading && expenses.length === 0 ? (
        <Text style={[styles.loadingText, { color: ownerColors.textMuted }]}>Loading…</Text>
      ) : null}

      <View style={{ height: ownerSpace.xl }} />
    </OwnerScreen>
  );
}

const useStyles = createStyles((c) => {
  const ownerColors = ownerColorsFromPalette(c);
  return {
    tabHeader: {
      paddingBottom: 4,
    },
    tabHeaderKicker: {
      color: ownerColors.gold,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.4,
      marginBottom: 4,
    },
    tabHeaderTitle: {
      color: ownerColors.text,
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    tabHeaderSubtitle: {
      color: ownerColors.textMuted,
      fontSize: 13,
      fontWeight: '500',
      marginTop: 4,
    },
    scanCtaWrap: {
      marginBottom: 14,
    },
    scanCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: brandGold.dark,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 16,
    },
    scanCtaPressed: {
      opacity: 0.9,
    },
    scanCtaIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(15,15,15,0.12)',
    },
    scanCtaTitle: {
      color: '#0F0F0F',
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    scanCtaBody: {
      color: 'rgba(15,15,15,0.78)',
      fontSize: 12,
      marginTop: 2,
      lineHeight: 16,
    },
    listWrap: {
      paddingHorizontal: 4,
    },
    emptyWrap: {
      alignItems: 'center',
      paddingVertical: 36,
      gap: 8,
    },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: ownerColors.bgSurface,
    },
    emptyHeadline: {
      fontSize: 17,
      fontWeight: '700',
      letterSpacing: -0.2,
      marginTop: 4,
    },
    emptyBody: {
      fontSize: 14,
    },
    loadingText: {
      textAlign: 'center',
      fontSize: 13,
      paddingVertical: 12,
    },
  };
});
