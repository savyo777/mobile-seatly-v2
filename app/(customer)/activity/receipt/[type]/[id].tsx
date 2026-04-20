import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { ScreenWrapper, Button } from '@/components/ui';
import { buildReceiptHtml } from '@/lib/receipt/buildReceiptHtml';
import { getReceiptPayload } from '@/lib/receipt/getReceiptPayload';
import type { ReceiptActivityKind } from '@/lib/receipt/receiptTypes';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { colors, spacing, borderRadius, typography, shadows } from '@/lib/theme';

function isReceiptKind(s: string): s is ReceiptActivityKind {
  return s === 'booking' || s === 'order';
}

function formatWhen(iso: string, locale: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export default function ReceiptScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { type: rawType, id: rawId } = useLocalSearchParams<{ type: string; id: string }>();

  const [actionLoading, setActionLoading] = useState(false);

  const type = typeof rawType === 'string' ? rawType : '';
  const id = typeof rawId === 'string' ? rawId : '';

  const payload = useMemo(() => {
    if (!isReceiptKind(type)) return null;
    return getReceiptPayload(type, id);
  }, [type, id]);

  const html = useMemo(() => (payload ? buildReceiptHtml(payload) : ''), [payload]);

  const runWithLoading = useCallback(async (fn: () => Promise<void>) => {
    setActionLoading(true);
    try {
      await fn();
    } catch (e) {
      console.warn(e);
      Alert.alert(t('common.error'), t('receipt.actionError'));
    } finally {
      setActionLoading(false);
    }
  }, [t]);

  const handlePrint = useCallback(() => {
    if (!html) return;
    runWithLoading(async () => {
      await Print.printAsync({ html });
    });
  }, [html, runWithLoading]);

  const handleShare = useCallback(() => {
    if (!html) return;
    runWithLoading(async () => {
      const { uri } = await Print.printToFileAsync({ html });
      const can = await Sharing.isAvailableAsync();
      if (!can) {
        Alert.alert(t('receipt.shareUnavailable'));
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: t('receipt.shareDialogTitle'),
        UTI: 'com.adobe.pdf',
      });
    });
  }, [html, runWithLoading, t]);

  const handleDownload = useCallback(() => {
    if (!html || !payload) return;
    runWithLoading(async () => {
      if (!FileSystem.documentDirectory) {
        Alert.alert(t('common.error'), t('receipt.saveUnavailable'));
        return;
      }
      const { uri } = await Print.printToFileAsync({ html });
      const safeRef = payload.referenceId.replace(/[^a-zA-Z0-9-_]/g, '-');
      const fileName = `Cenaiva-Receipt-${safeRef}.pdf`;
      const dest = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      Alert.alert(t('receipt.savedTitle'), t('receipt.savedBody', { fileName }));
    });
  }, [html, payload, runWithLoading, t]);

  if (!payload) {
    return (
      <ScreenWrapper scrollable={false} padded>
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <Text style={styles.errorText}>{t('receipt.notFound')}</Text>
          <Button title={t('common.back')} onPress={() => router.back()} variant="outlined" />
        </View>
      </ScreenWrapper>
    );
  }

  const when = formatWhen(payload.dateTimeIso, i18n.language);

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <View style={[styles.root, { paddingBottom: insets.bottom }]}>
        <Animated.View entering={FadeIn.duration(380)} style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.75 }]}
            hitSlop={12}
          >
            <Text style={styles.backChevron} accessible={false}>
              ←
            </Text>
          </Pressable>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {t('receipt.title')}
          </Text>
          <View style={styles.backBtn} />
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <Animated.View entering={FadeInDown.duration(420).delay(60)}>
            <Text style={styles.brand}>CENAIVA</Text>
            <Text style={styles.h1}>{payload.restaurantName}</Text>
            <Text style={styles.when}>{when}</Text>

            <View style={styles.row}>
              <Text style={styles.label}>{t('receipt.status')}</Text>
              <Text style={styles.value}>{payload.statusLabel}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('receipt.partySize')}</Text>
              <Text style={styles.value}>{payload.partySize}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('receipt.reference')}</Text>
              <Text style={styles.valueMono} numberOfLines={1}>
                {payload.referenceId}
              </Text>
            </View>

            {payload.items.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>{t('receipt.items')}</Text>
                {payload.items.map((it, idx) => (
                  <View key={`${it.name}-${idx}`} style={styles.lineRow}>
                    <View style={styles.lineMain}>
                      <Text style={styles.lineName} numberOfLines={2}>
                        {it.name}
                      </Text>
                      {it.note ? <Text style={styles.lineNote}>{it.note}</Text> : null}
                    </View>
                    <Text style={styles.lineQty}>×{it.quantity}</Text>
                    <Text style={styles.lineTotal}>{formatCurrency(it.lineTotal, 'cad')}</Text>
                  </View>
                ))}
                <View style={styles.totalsBox}>
                  <View style={styles.totalLine}>
                    <Text style={styles.totalLabel}>{t('receipt.subtotal')}</Text>
                    <Text style={styles.totalVal}>{formatCurrency(payload.subtotal, 'cad')}</Text>
                  </View>
                  <View style={styles.totalLine}>
                    <Text style={styles.totalLabel}>{t('receipt.tax')}</Text>
                    <Text style={styles.totalVal}>{formatCurrency(payload.taxAmount, 'cad')}</Text>
                  </View>
                  <View style={styles.totalLine}>
                    <Text style={styles.totalLabel}>{t('receipt.tip')}</Text>
                    <Text style={styles.totalVal}>{formatCurrency(payload.tipAmount, 'cad')}</Text>
                  </View>
                  <View style={[styles.totalLine, styles.totalGrand]}>
                    <Text style={styles.totalLabelGold}>{t('receipt.total')}</Text>
                    <Text style={styles.totalGold}>{formatCurrency(payload.totalAmount, 'cad')}</Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.emptyItems}>{t('receipt.noItems')}</Text>
            )}

            {payload.footerNote ? <Text style={styles.footerNote}>{payload.footerNote}</Text> : null}

            <View style={styles.guestBox}>
              <Text style={styles.sectionTitle}>{t('receipt.guest')}</Text>
              <Text style={styles.guestName}>{payload.guestName}</Text>
              {payload.guestEmail ? <Text style={styles.guestEmail}>{payload.guestEmail}</Text> : null}
            </View>
          </Animated.View>
        </ScrollView>

        <Animated.View entering={FadeInDown.duration(400).delay(120)} style={styles.actions}>
          <Button
            title={t('receipt.downloadPdf')}
            onPress={handleDownload}
            variant="outlined"
            disabled={actionLoading}
          />
          <View style={styles.actionGap} />
          <Button
            title={t('receipt.share')}
            onPress={handleShare}
            variant="outlined"
            disabled={actionLoading}
          />
          <View style={styles.actionGap} />
          <Button title={t('receipt.print')} onPress={handlePrint} disabled={actionLoading} />
        </Animated.View>
      </View>

      {actionLoading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      ) : null}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  backChevron: {
    fontSize: 26,
    color: colors.gold,
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  brand: {
    ...typography.label,
    color: colors.gold,
    marginBottom: spacing.sm,
  },
  h1: {
    ...typography.h1,
    color: colors.gold,
    marginBottom: spacing.sm,
  },
  when: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textMuted,
    flexShrink: 0,
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  valueMono: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  sectionTitle: {
    ...typography.label,
    color: colors.gold,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lineMain: {
    flex: 1,
    minWidth: 0,
  },
  lineName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  lineNote: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 4,
  },
  lineQty: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    width: 36,
    textAlign: 'right',
  },
  lineTotal: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
    width: 72,
    textAlign: 'right',
  },
  totalsBox: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  totalGrand: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginBottom: 0,
  },
  totalLabel: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  totalVal: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  totalLabelGold: {
    ...typography.body,
    color: colors.gold,
    fontWeight: '700',
  },
  totalGold: {
    ...typography.bodyLarge,
    color: colors.gold,
    fontWeight: '800',
  },
  emptyItems: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  footerNote: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.lg,
    lineHeight: 20,
  },
  guestBox: {
    marginTop: spacing['2xl'],
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  guestName: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  guestEmail: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bgBase,
  },
  actionGap: {
    height: spacing.sm,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
