import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ListRenderItem, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper, Card, Button, Badge } from '@/components/ui';
import { isLoyaltyEnabled } from '@/lib/config/loyaltyFeature';
import { useColors, createStyles, spacing, borderRadius, typography, shadows } from '@/lib/theme';
import {
  mockLoyaltyTransactions as MOCK_LOYALTY_TRANSACTIONS,
  mockRewards as MOCK_REWARDS,
  type LoyaltyReward,
  type LoyaltyTransaction,
} from '@/lib/mock/loyalty';
import { mockCustomer } from '@/lib/mock/users';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { LOYALTY_TIERS } from '@/lib/loyalty/tiers';
import {
  fetchLoyaltyTransactionsForUser,
  type LoyaltyTransactionRow,
} from '@/lib/loyalty/getLoyaltyTransactions';
import { fetchCurrentUserProfile, getCurrentUserProfileId } from '@/lib/services/userProfile';

// Real loyalty transactions and reward catalog should come from
// `loyalty_transactions` / `loyalty_rewards` Supabase tables. Mock fallback
// only renders when demo mode is enabled.
const demo = isDemoModeEnabled();
const initialMockLoyaltyTransactions: LoyaltyTransaction[] = demo ? MOCK_LOYALTY_TRANSACTIONS : [];
const mockRewards = demo ? MOCK_REWARDS : [];
const initialPointsBalance = demo ? mockCustomer.loyaltyPointsBalance : 0;
const initialTier: string | null = demo ? mockCustomer.loyaltyTier ?? null : null;

function tierLabelForBalance(balance: number): string | null {
  // Pick the highest tier the user has crossed.
  let label: string | null = null;
  for (const tier of LOYALTY_TIERS) {
    if (balance >= tier.min) label = tier.name;
  }
  return label;
}

function mapLoyaltyRowToTransaction(row: LoyaltyTransactionRow): LoyaltyTransaction {
  const rawType = (row.type ?? '').toLowerCase();
  const type: LoyaltyTransaction['type'] =
    rawType === 'redeem' ? 'redeem' : rawType === 'expire' ? 'expire' : 'earn';
  return {
    id: row.id,
    points: row.points,
    balanceAfter: typeof row.balance_after === 'number' ? row.balance_after : 0,
    type,
    description: row.description ?? '',
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

// Threshold for the "Gold" tier comes from the canonical loyalty-tier table
// in lib/loyalty/tiers.ts. The progress bar on this screen is specifically
// "progress to Gold" since Gold is the headline tier the marketing screen
// promotes; if the tier table changes, this constant follows it.
const GOLD_THRESHOLD = LOYALTY_TIERS.find((t) => t.name === 'Gold')?.min ?? 1500;

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

const useStyles = createStyles((c) => ({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backHit: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
  },
  listContent: {
    paddingBottom: spacing['3xl'],
  },
  screenTitle: {
    ...typography.h1,
    color: c.textPrimary,
    marginBottom: spacing.lg,
  },
  balanceCard: {
    ...shadows.goldGlow,
    borderColor: c.gold,
    marginBottom: spacing['2xl'],
  },
  balanceNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: c.gold,
    letterSpacing: 0.5,
  },
  tierRow: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  progressLabel: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginBottom: spacing.sm,
  },
  progressTrack: {
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: c.gold,
    borderRadius: borderRadius.full,
  },
  progressHint: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: c.textPrimary,
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
    color: c.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  rewardDescription: {
    ...typography.body,
    color: c.textSecondary,
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
    borderBottomColor: c.border,
  },
  txMain: {
    flex: 1,
    paddingRight: spacing.md,
  },
  txType: {
    ...typography.label,
    color: c.gold,
    marginBottom: spacing.xs,
  },
  txDesc: {
    ...typography.body,
    color: c.textPrimary,
  },
  txDate: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: spacing.xs,
  },
  txPoints: {
    ...typography.bodyLarge,
    fontWeight: '700',
  },
  earnCard: {
    marginBottom: spacing['2xl'],
    borderColor: 'rgba(201, 168, 76, 0.25)',
  },
  earnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  earnRowLast: {
    marginBottom: 0,
  },
  earnDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.gold,
    marginTop: 7,
  },
  earnText: {
    ...typography.body,
    color: c.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
  emptyRedeem: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginBottom: spacing.lg,
  },
  redeemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  activityTitle: {
    marginTop: spacing.lg,
  },
}));

function EarnBullet({ text, isLast }: { text: string; isLast?: boolean }) {
  const styles = useStyles();
  return (
    <View style={[styles.earnRow, isLast && styles.earnRowLast]}>
      <View style={styles.earnDot} />
      <Text style={styles.earnText}>{text}</Text>
    </View>
  );
}

export default function ProfileLoyaltyScreen() {
  // Loyalty feature is currently disabled — the original screen below is
  // preserved in source so flipping the flag at lib/config/loyaltyFeature.ts
  // restores it without a rewrite. The inner component holds the real
  // implementation; this outer fn just gates it to keep hook order stable.
  if (!isLoyaltyEnabled()) {
    return <Redirect href="/(customer)/profile" />;
  }
  return <ProfileLoyaltyScreenInner />;
}

function ProfileLoyaltyScreenInner() {
  const { t, i18n } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();

  const [loyaltyTransactions, setLoyaltyTransactions] = useState<LoyaltyTransaction[]>(
    initialMockLoyaltyTransactions,
  );
  const [loyaltyPointsBalance, setLoyaltyPointsBalance] = useState<number>(initialPointsBalance);
  const [loyaltyTier, setLoyaltyTier] = useState<string | null>(initialTier);

  useEffect(() => {
    if (isDemoModeEnabled()) return;
    let active = true;
    void (async () => {
      try {
        const profileId = await getCurrentUserProfileId();
        if (!profileId) return;
        const [profile, rows] = await Promise.all([
          fetchCurrentUserProfile(),
          fetchLoyaltyTransactionsForUser(profileId, { limit: 50 }),
        ]);
        if (!active) return;
        const mapped = rows.map(mapLoyaltyRowToTransaction);
        setLoyaltyTransactions(mapped);
        // user_profiles.loyalty_points_balance is the source of truth; fall
        // back to the most recent balance_after if the profile is unset.
        const latestBalanceAfter =
          rows.length > 0 && typeof rows[0].balance_after === 'number' ? rows[0].balance_after : null;
        const balance = profile?.loyaltyPointsBalance ?? latestBalanceAfter ?? 0;
        setLoyaltyPointsBalance(balance);
        setLoyaltyTier(profile?.loyaltyTier ?? tierLabelForBalance(balance));
      } catch (err) {
        if (__DEV__) console.warn('[loyalty] fetch failed', err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const sortedTx = useMemo(
    () => [...loyaltyTransactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [loyaltyTransactions],
  );

  const progress = Math.min(loyaltyPointsBalance / GOLD_THRESHOLD, 1);
  const pointsToGold = Math.max(0, GOLD_THRESHOLD - loyaltyPointsBalance);
  const redeemedTx = useMemo(() => sortedTx.filter((tx) => tx.type === 'redeem'), [sortedTx]);

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
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12} style={styles.backHit}>
          <Ionicons name="chevron-back" size={26} color={c.gold} />
        </Pressable>
      </View>
      <Text style={styles.screenTitle}>{t('loyalty.title')}</Text>
      <Card style={styles.balanceCard}>
        <Text style={styles.balanceNumber}>
          {loyaltyPointsBalance.toLocaleString()} {t('loyalty.points')}
        </Text>
        <View style={styles.tierRow}>
          <Badge label={loyaltyTier ?? t('loyalty.tierSilver')} variant="gold" size="md" />
        </View>
        <Text style={styles.progressLabel}>
          {t('loyalty.progressToGold')} · {t('loyalty.tierGold')}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressHint}>{t('loyalty.needsMoreForGold', { count: pointsToGold })}</Text>
      </Card>
      <Text style={styles.sectionTitle}>How to earn more points</Text>
      <Card style={styles.earnCard}>
        <EarnBullet text="Complete eligible reservations — points post after your visit." />
        <EarnBullet text="Pre-order or add experiences when restaurants offer bonus multipliers." />
        <EarnBullet text="Invite friends; earn bonus points when they complete a first booking." isLast />
      </Card>
      <Text style={styles.sectionTitle}>{t('loyalty.rewards')}</Text>
    </>
  );

  const footer = (
    <View style={styles.footer}>
      <Text style={styles.sectionTitle}>Redeemed rewards</Text>
      {redeemedTx.length === 0 ? (
        <Text style={styles.emptyRedeem}>No redemptions yet — browse available rewards below.</Text>
      ) : (
        redeemedTx.map((tx) => (
          <View key={tx.id} style={styles.redeemRow}>
            <View style={styles.txMain}>
              <Text style={styles.txDesc} numberOfLines={2}>
                {tx.description}
              </Text>
              <Text style={styles.txDate}>{formatActivityDate(tx.createdAt, i18n.language)}</Text>
            </View>
            <Text style={[styles.txPoints, { color: c.danger }]}>{tx.points.toLocaleString()}</Text>
          </View>
        ))
      )}
      <Text style={[styles.sectionTitle, styles.activityTitle]}>{t('loyalty.recentActivity')}</Text>
      {sortedTx.map((tx) => {
        const isEarn = tx.type === 'earn';
        const sign = isEarn ? '+' : tx.points < 0 ? '' : '+';
        const ptsColor = tx.points >= 0 ? c.success : c.danger;
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
