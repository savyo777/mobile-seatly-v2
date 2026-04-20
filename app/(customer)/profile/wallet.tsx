import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ChevronGlyph } from '@/components/ui/ChevronGlyph';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { ProfileSectionTitle } from '@/components/profile/ProfileSectionTitle';
import { Card, Badge, Button } from '@/components/ui';
import { mockPaymentMethods, mockGiftCards, mockWalletCredits } from '@/lib/mock/profileScreens';
import { mockCustomer } from '@/lib/mock/users';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/theme';

const MINI_ACTIVITY = [
  { id: '1', title: 'Referral bonus applied', sub: 'Mar 12 · Cenaiva Credits', amount: 15 },
  { id: '2', title: 'Nova Ristorante deposit', sub: 'Mar 8 · Card ···· 4821', amount: -40 },
  { id: '3', title: 'Gift card redeemed', sub: 'Feb 22 · Holiday Promo', amount: -25 },
];

export default function WalletScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const totalCredits = mockWalletCredits.reduce((s, c) => s + c.amount, 0);
  const giftTotal = mockGiftCards.reduce((s, g) => s + g.balance, 0);

  return (
    <ProfileStackScreen title={t('profile.quickWallet')}>
      <Card style={{ ...styles.hero, ...shadows.goldGlow }}>
        <Text style={styles.heroLabel}>Reward balance</Text>
        <Text style={styles.heroPoints}>
          {mockCustomer.loyaltyPointsBalance.toLocaleString()} pts
        </Text>
        <Text style={styles.heroSub}>Tap through to redeem perks and track tier progress</Text>
        <Button title="View rewards" variant="outlined" size="sm" fullWidth onPress={() => router.push('/(customer)/profile/rewards')} />
      </Card>

      <ProfileSectionTitle>Cenaiva credits</ProfileSectionTitle>
      <Card style={styles.card}>
        <View style={styles.creditTotalRow}>
          <Text style={styles.creditTotalLabel}>Available</Text>
          <Text style={styles.creditTotal}>{formatCurrency(totalCredits, 'CAD')}</Text>
        </View>
        {mockWalletCredits.map((c) => (
          <View key={c.id} style={styles.creditLine}>
            <View>
              <Text style={styles.creditTitle}>{c.label}</Text>
              {c.expires ? <Text style={styles.creditExp}>Expires {c.expires}</Text> : null}
            </View>
            <Text style={styles.creditAmt}>+{formatCurrency(c.amount, 'CAD')}</Text>
          </View>
        ))}
      </Card>

      <ProfileSectionTitle>Gift cards</ProfileSectionTitle>
      <Card style={styles.card}>
        <View style={styles.creditTotalRow}>
          <Text style={styles.creditTotalLabel}>Combined balance</Text>
          <Text style={styles.creditTotal}>{formatCurrency(giftTotal, 'CAD')}</Text>
        </View>
        {mockGiftCards.map((g) => (
          <View key={g.id} style={styles.giftRow}>
            <View style={styles.giftLeft}>
              <Ionicons name="gift-outline" size={22} color={colors.gold} />
              <View>
                <Text style={styles.creditTitle}>{g.label}</Text>
                <Text style={styles.creditExp}>···· {g.codeLast4}</Text>
              </View>
            </View>
            <Text style={styles.creditAmt}>{formatCurrency(g.balance, 'CAD')}</Text>
          </View>
        ))}
      </Card>

      <ProfileSectionTitle>Payment methods</ProfileSectionTitle>
      <Card style={styles.card}>
        {mockPaymentMethods.map((m, i) => (
          <View key={m.id} style={[styles.payRow, i > 0 && styles.payRowBorder]}>
            <Ionicons name="card-outline" size={22} color={colors.gold} />
            <View style={styles.flex}>
              <Text style={styles.creditTitle}>
                {m.brand === 'visa' ? 'Visa' : 'Mastercard'} ···· {m.last4}
              </Text>
              <Text style={styles.creditExp}>Exp {m.expiry}</Text>
            </View>
            {m.isDefault ? <Badge label="Default" variant="gold" size="sm" /> : null}
          </View>
        ))}
        <Pressable style={styles.managePay} onPress={() => router.push('/(customer)/profile/payment')}>
          <Text style={styles.managePayText}>Manage payment methods</Text>
          <ChevronGlyph color={colors.gold} size={18} />
        </Pressable>
      </Card>

      <ProfileSectionTitle>Recent wallet activity</ProfileSectionTitle>
      {MINI_ACTIVITY.map((row) => (
        <View key={row.id} style={styles.actRow}>
          <View style={styles.actIcon}>
            <Ionicons name="receipt-outline" size={18} color={colors.gold} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.actTitle}>{row.title}</Text>
            <Text style={styles.actSub}>{row.sub}</Text>
          </View>
          <Text style={[styles.actAmt, row.amount < 0 && styles.actAmtNeg]}>
            {row.amount > 0 ? '+' : ''}
            {formatCurrency(Math.abs(row.amount), 'CAD')}
          </Text>
        </View>
      ))}
    </ProfileStackScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: spacing.lg,
    borderColor: 'rgba(201, 168, 76, 0.4)',
  },
  heroLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  heroPoints: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.gold,
    marginVertical: spacing.sm,
  },
  heroSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  card: {
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  creditTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  creditTotalLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  creditTotal: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  creditLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  creditTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  creditExp: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 2,
  },
  creditAmt: {
    ...typography.body,
    color: colors.success,
    fontWeight: '700',
  },
  giftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  giftLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  payRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  flex: {
    flex: 1,
  },
  managePay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  managePayText: {
    ...typography.body,
    color: colors.gold,
    fontWeight: '600',
  },
  actRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  actIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  actSub: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 2,
  },
  actAmt: {
    ...typography.body,
    color: colors.success,
    fontWeight: '700',
  },
  actAmtNeg: {
    color: colors.textSecondary,
  },
});
