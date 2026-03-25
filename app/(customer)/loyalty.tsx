import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ListRenderItem } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper, Card, Button, Badge } from '@/components/ui';
import { colors, spacing, borderRadius, typography, shadows } from '@/lib/theme';
import { mockLoyaltyTransactions, mockRewards, type LoyaltyReward } from '@/lib/mock/loyalty';
import { mockCustomer } from '@/lib/mock/users';

const GOLD_THRESHOLD = 2000;
const POINTS_TO_GOLD = 750;

function formatActivityDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale === 'fr' ? 'fr-CA' : 'en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function LoyaltyScreen() {
  const { t, i18n } = useTranslation();
  const sortedTx = useMemo(
    () => [...mockLoyaltyTransactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [],
  );

  const progress = Math.min(mockCustomer.loyaltyPointsBalance / GOLD_THRESHOLD, 1);

  const renderReward: ListRenderItem<LoyaltyReward> = ({ item }) => (
    <Card style={styles.rewardCard}>
      <View style={styles.rewardHeader}>
        <Text style={styles.rewardName}>{item.name}</Text>
        <Badge label={t('loyalty.pointsShort', { count: item.pointsCost })} variant="gold" />
      </View>
      <Text style={styles.rewardDescription}>{item.description}</Text>
      <Button title={t('loyalty.redeemPoints')} variant="outlined" size="sm" fullWidth onPress={() => {}} />
    </Card>
  );

  const header = (
    <>
      <Text style={styles.screenTitle}>{t('loyalty.title')}</Text>
      <Card style={styles.balanceCard}>
        <Text style={styles.balanceNumber}>
          {mockCustomer.loyaltyPointsBalance.toLocaleString()} {t('loyalty.points')}
        </Text>
        <View style={styles.tierRow}>
          <Badge label={mockCustomer.loyaltyTier ?? t('loyalty.tierSilver')} variant="gold" size="md" />
        </View>
        <Text style={styles.progressLabel}>
          {t('loyalty.progressToGold')} · {t('loyalty.tierGold')}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressHint}>{t('loyalty.needsMoreForGold', { count: POINTS_TO_GOLD })}</Text>
      </Card>
      <Text style={styles.sectionTitle}>{t('loyalty.rewards')}</Text>
    </>
  );

  const footer = (
    <View style={styles.footer}>
      <Text style={styles.sectionTitle}>{t('loyalty.recentActivity')}</Text>
      {sortedTx.map((tx) => {
        const isEarn = tx.type === 'earn';
        const sign = isEarn ? '+' : tx.points < 0 ? '' : '+';
        const ptsColor = tx.points >= 0 ? colors.success : colors.danger;
        const typeKey = tx.type === 'earn' ? 'earn' : tx.type === 'redeem' ? 'redeem' : 'expire';
        return (
          <View key={tx.id} style={styles.txRow}>
            <View style={styles.txMain}>
              <Text style={styles.txType}>{t(`loyalty.${typeKey}`)}</Text>
              <Text style={styles.txDesc} numberOfLines={2}>
                {tx.description}
              </Text>
              <Text style={styles.txDate}>{formatActivityDate(tx.createdAt, i18n.language)}</Text>
            </View>
            <Text style={[styles.txPoints, { color: ptsColor }]}>
              {sign}
              {tx.points.toLocaleString()}
            </Text>
          </View>
        );
      })}
    </View>
  );

  return (
    <ScreenWrapper scrollable={false} padded>
      <FlatList
        data={mockRewards}
        keyExtractor={(item) => item.id}
        renderItem={renderReward}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: spacing['3xl'],
  },
  screenTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  balanceCard: {
    ...shadows.goldGlow,
    borderColor: colors.gold,
    marginBottom: spacing['2xl'],
  },
  balanceNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 0.5,
  },
  tierRow: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  progressLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  progressTrack: {
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: borderRadius.full,
  },
  progressHint: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  rewardCard: {
    marginBottom: spacing.md,
  },
  rewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  rewardName: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  rewardDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  footer: {
    marginTop: spacing['2xl'],
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  txMain: {
    flex: 1,
    paddingRight: spacing.md,
  },
  txType: {
    ...typography.label,
    color: colors.gold,
    marginBottom: spacing.xs,
  },
  txDesc: {
    ...typography.body,
    color: colors.textPrimary,
  },
  txDate: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  txPoints: {
    ...typography.bodyLarge,
    fontWeight: '700',
  },
});
