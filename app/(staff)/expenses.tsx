import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { File as FsFile } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { ExpenseSummaryCard } from '@/components/owner/ExpenseSummaryCard';
import { ExpenseListRow } from '@/components/owner/ExpenseListRow';
import { ExpenseFilterBar } from '@/components/owner/expenses/ExpenseFilterBar';
import { useExpenses } from '@/lib/context/ExpensesContext';
import { setPendingScan } from '@/lib/expenses/pendingScan';
import {
  EMPTY_EXPENSE_FILTER,
  applyExpenseFilter,
  isExpenseFilterActive,
  type ExpenseFilter,
} from '@/lib/expenses/filter';
import { createStyles } from '@/lib/theme';
import { ownerColorsFromPalette, ownerSpace, useOwnerColors } from '@/lib/theme/ownerTheme';
import { brandGold, withAlpha } from '@/lib/theme/tokens';

function mimeFromName(name: string | null | undefined): string {
  const lower = (name ?? '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.heif')) return 'image/heif';
  return 'image/jpeg';
}

export default function OwnerExpensesScreen() {
  const router = useRouter();
  const ownerColors = useOwnerColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { expenses, loading } = useExpenses();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [filter, setFilter] = useState<ExpenseFilter>(EMPTY_EXPENSE_FILTER);

  const filteredExpenses = useMemo(
    () => applyExpenseFilter(expenses, filter),
    [expenses, filter],
  );
  const filterActive = isExpenseFilterActive(filter);

  const handleOpenReports = useCallback(() => {
    router.push('/(staff)/expense-reports');
  }, [router]);

  const handleOpenPicker = useCallback(() => {
    void Haptics.selectionAsync().catch(() => {});
    setPickerOpen(true);
  }, []);

  const handleClosePicker = useCallback(() => {
    if (loadingFile) return;
    setPickerOpen(false);
  }, [loadingFile]);

  const handleCamera = useCallback(() => {
    setPickerOpen(false);
    router.push('/(staff)/expense-scan');
  }, [router]);

  const handleManual = useCallback(() => {
    setPickerOpen(false);
    router.push({ pathname: '/(staff)/expense-review', params: { mode: 'manual' } });
  }, [router]);

  const handleFile = useCallback(async () => {
    if (loadingFile) return;
    setLoadingFile(true);
    try {
      const picked = await FsFile.pickFileAsync(undefined, 'image/*');
      const asset = Array.isArray(picked) ? picked[0] : picked;
      if (!asset) return;
      const mime = mimeFromName(asset.name);
      // expo-file-system on SDK 55 uses the object-oriented `File` API.
      // `base64()` reads the file contents and returns a base64 string,
      // which is what the scan-receipt edge function expects.
      const base64 = await asset.base64();
      if (!base64) return;
      setPendingScan({
        uri: asset.uri,
        base64,
        mimeType: mime,
        source: 'file',
        fileName: asset.name,
      });
      setPickerOpen(false);
      router.push('/(staff)/expense-review');
    } catch {
      // Picker errors fall through silently — the sheet stays open so the
      // owner can try another option.
    } finally {
      setLoadingFile(false);
    }
  }, [loadingFile, router]);

  const handleOpenDetail = useCallback(
    (id: string) => {
      router.push({ pathname: '/(staff)/expense-detail', params: { id } });
    },
    [router],
  );

  const listHeader = (
    <View>
      <View style={styles.scanCtaWrap}>
        <Pressable
          style={({ pressed }) => [styles.scanCta, pressed && styles.scanCtaPressed]}
          onPress={handleOpenPicker}
          accessibilityRole="button"
          accessibilityLabel="Track expense"
        >
          <View style={styles.scanCtaIcon}>
            <Ionicons name="add" size={20} color="#0F0F0F" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.scanCtaTitle}>Track expense</Text>
            <Text style={styles.scanCtaBody}>Snap a receipt, upload a file, or enter the details manually.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#0F0F0F" />
        </Pressable>
      </View>

      <ExpenseSummaryCard expenses={expenses} />

      <ExpenseFilterBar value={filter} onChange={setFilter} />
    </View>
  );

  const listEmpty = (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIcon, { borderColor: ownerColors.border }]}>
        <Ionicons name="receipt-outline" size={28} color={ownerColors.textMuted} />
      </View>
      <Text style={[styles.emptyHeadline, { color: ownerColors.text }]}>
        {filterActive ? 'No matches' : 'No expenses yet.'}
      </Text>
      <Text style={[styles.emptyBody, { color: ownerColors.textMuted }]}>
        {filterActive
          ? 'Try widening the date range or clearing a filter.'
          : 'Track your first.'}
      </Text>
      {loading && expenses.length === 0 ? (
        <Text style={[styles.loadingText, { color: ownerColors.textMuted }]}>Loading…</Text>
      ) : null}
    </View>
  );

  return (
    <>
      <OwnerScreen
        scrollable={false}
        header={
          <View style={styles.tabHeader}>
            <Text style={styles.tabHeaderKicker}>EXPENSES</Text>
            <View style={styles.tabHeaderTitleRow}>
              <Text style={styles.tabHeaderTitle}>Expenses</Text>
              <Pressable
                onPress={handleOpenReports}
                hitSlop={8}
                style={({ pressed }) => [styles.reportsLink, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel="View reports"
              >
                <Ionicons name="bar-chart-outline" size={16} color={ownerColors.gold} />
                <Text style={styles.reportsLinkText}>Reports</Text>
              </Pressable>
            </View>
            <Text style={styles.tabHeaderSubtitle}>Track receipts and expenses — Cenaiva fills the rest.</Text>
          </View>
        }
      >
        <FlatList
          data={filteredExpenses}
          keyExtractor={(exp) => exp.id}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 25).duration(240)}>
              <ExpenseListRow expense={item} onPress={() => handleOpenDetail(item.id)} />
            </Animated.View>
          )}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={12}
          windowSize={9}
        />
      </OwnerScreen>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={handleClosePicker}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleClosePicker}>
          <Pressable
            style={[
              styles.modalSheet,
              { paddingBottom: insets.bottom + ownerSpace.lg, backgroundColor: ownerColors.bgElevated },
            ]}
            // Swallow taps so tapping inside the sheet doesn't bubble up
            // to the backdrop Pressable and close the modal.
            onPress={() => {}}
          >
            <View style={styles.modalGrabber} />
            <Text style={[styles.modalTitle, { color: ownerColors.text }]}>Track an expense</Text>
            <Text style={[styles.modalSubtitle, { color: ownerColors.textMuted }]}>
              Choose how to log it.
            </Text>

            <ChoiceRow
              icon="camera-outline"
              title="Camera"
              body="Snap a paper receipt now."
              onPress={handleCamera}
              disabled={loadingFile}
            />
            <ChoiceRow
              icon="document-outline"
              title="File"
              body="Pick an image receipt from Files."
              onPress={handleFile}
              loading={loadingFile}
              disabled={loadingFile}
            />
            <ChoiceRow
              icon="create-outline"
              title="Manual"
              body="Enter the details yourself."
              onPress={handleManual}
              disabled={loadingFile}
            />

            <Pressable
              style={styles.modalCancel}
              onPress={handleClosePicker}
              disabled={loadingFile}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={[styles.modalCancelText, { color: ownerColors.gold }]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function ChoiceRow({
  icon,
  title,
  body,
  onPress,
  loading = false,
  disabled = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const ownerColors = useOwnerColors();
  return (
    <Pressable
      style={({ pressed }) => [
        choiceStyles.row,
        {
          backgroundColor: ownerColors.bgSurface,
          borderColor: withAlpha(brandGold.dark, 0.15),
        },
        pressed && !disabled && choiceStyles.rowPressed,
        disabled && !loading && choiceStyles.rowDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View
        style={[
          choiceStyles.iconWrap,
          { backgroundColor: withAlpha(brandGold.dark, 0.14) },
        ]}
      >
        <Ionicons name={icon} size={20} color={ownerColors.gold} />
      </View>
      <View style={choiceStyles.text}>
        <Text style={[choiceStyles.title, { color: ownerColors.text }]}>{title}</Text>
        <Text style={[choiceStyles.body, { color: ownerColors.textMuted }]}>
          {loading ? 'Reading file…' : body}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={ownerColors.textMuted} />
    </Pressable>
  );
}

const choiceStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowDisabled: {
    opacity: 0.55,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  body: {
    fontSize: 12,
    marginTop: 2,
  },
});

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
    tabHeaderTitleRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 8,
    },
    tabHeaderTitle: {
      color: ownerColors.text,
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    reportsLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: withAlpha(brandGold.dark, 0.35),
      backgroundColor: withAlpha(brandGold.dark, 0.08),
    },
    reportsLinkText: {
      color: ownerColors.gold,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    listContent: {
      paddingTop: ownerSpace.sm,
      paddingBottom: ownerSpace.xl,
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
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      paddingTop: 10,
      paddingHorizontal: ownerSpace.md,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
    },
    modalGrabber: {
      alignSelf: 'center',
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.18)',
      marginBottom: 14,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    modalSubtitle: {
      fontSize: 13,
      marginTop: 4,
      marginBottom: 6,
    },
    modalCancel: {
      paddingVertical: 14,
      marginTop: 8,
      alignItems: 'center',
    },
    modalCancelText: {
      fontSize: 15,
      fontWeight: '700',
    },
  };
});
