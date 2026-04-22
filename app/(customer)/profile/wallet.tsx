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
import { useColors, createStyles, spacing, typography, borderRadius, shadows } from '@/lib/theme';

const MINI_ACTIVITY = [
  { id: '1', title: 'Referral bonus applied', sub: 'Mar 12 · Cenaiva Credits', amount: 15 },
  { id: '2', title: 'Nova Ristorante deposit', sub: 'Mar 8 · Card ···· 4821', amount: -40 },
  { id: '3', title: 'Gift card redeemed', sub: 'Feb 22 · Holiday Promo', amount: -25 },
];

const useStyles = createStyles((c) => ({
  hero: {
    marginBottom: spacing.lg,
    borderColor: 'rgba(201, 168, 76, 0.4)',
  },
  heroLabel: {
    ...typography.label,
    color: c.textMuted,
  },
  heroPoints: {
    fontSize: 32,
    fontWeight: '800',
    color: c.gold,
    marginVertical: spacing.sm,
  },
  heroSub: {
    ...typography.bodySmall,
    color: c.textSecondary,
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
    borderBottomColor: c.border,
  },
  creditTotalLabel: {
    ...typography.body,
    color: c.textSecondary,
  },
  creditTotal: {
    ...typography.h3,
    color: c.textPrimary,
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
    color: c.textPrimary,
    fontWeight: '600',
  },
  creditExp: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: 2,
  },
  creditAmt: {
    ...typography.body,
    color: c.success,
    fontWeight: '700',
  },
  giftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
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
    borderTopColor: c.border,
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
    borderTopColor: c.border,
  },
  managePayText: {
    ...typography.body,
    color: c.gold,
    fontWeight: '600',
  },
  actRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  actIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '600',
  },
  actSub: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: 2,
  },
  actAmt: {
    ...typography.body,
    color: c.success,
    fontWeight: '700',
  },
  actAmtNeg: {
    color: c.textSecondary,
  },
}));

export default function WalletScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const totalCredits = mockWalletCredits.reduce((s, cr) => s + cr.amount, 0);
  const giftTotal = mockGiftCards.reduce((s, g) => s + g.balance, 0);

  return (
    <ProfileStackScreen title={t('profile.quickWallet')}>
      <Card style={{ ...styles.hero, ...shadows.goldGlow }}>
        <Text style={styles.heroLabel}>Reward balance</Text>
        <Text style={styles.heroPoints}>
          {mockCustomer.loyaltyPointsBalance.toLocaleString()} pts
        </Text>
        <Text style={styles.heroSub}>Tap through to redeem perks and track tier progress</Text>
        <Button title="View rewards" variant="outlined" size="sm" fullWidth onPress={() => router.push('/(customer)/profile/loyalty')} />
      </Card>

      <ProfileSectionTitle>Cenaiva credits</ProfileSectionTitle>
      <Card style={styles.card}>
        <View style={styles.creditTotalRow}>
          <Text style={styles.creditTotalLabel}>Available</Text>
          <Text style={styles.creditTotal}>{formatCurrency(totalCredits, 'CAD')}</Text>
        </View>
        {mockWalletCredits.map((cr) => (
          <View key={cr.id} style={styles.creditLine}>
            <View>
              <Text style={styles.creditTitle}>{cr.label}</Text>
              {cr.expires ? <Text style={styles.creditExp}>Expires {cr.expires}</Text> : null}
            </View>
            <Text style={styles.creditAmt}>+{formatCurrency(cr.amount, 'CAD')}</Text>
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
              <Ionicons name="gift-outline" size={22} color={c.gold} />
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
            <Ionicons name="card-outline" size={22} color={c.gold} />
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
          <ChevronGlyph color={c.gold} size={18} />
        </Pressable>
      </Card>

      <ProfileSectionTitle>Recent wallet activity</ProfileSectionTitle>
      {MINI_ACTIVITY.map((row) => (
        <View key={row.id} style={styles.actRow}>
          <View style={styles.actIcon}>
            <Ionicons name="receipt-outline" size={18} color={c.gold} />
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
