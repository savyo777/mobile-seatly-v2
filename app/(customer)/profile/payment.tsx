import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ChevronGlyph } from '@/components/ui/ChevronGlyph';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { ProfileSectionTitle } from '@/components/profile/ProfileSectionTitle';
import { Card, Button, Badge } from '@/components/ui';
import { mockPaymentMethods, mockWalletCredits, type PaymentMethod } from '@/lib/mock/profileScreens';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { useColors, createStyles, spacing, typography, borderRadius, shadows } from '@/lib/theme';

const useStyles = createStyles((c) => ({
  walletHero: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.2)',
  },
  walletHeroLabel: {
    ...typography.label,
    fontSize: 10,
    letterSpacing: 1.5,
    color: c.textMuted,
    marginBottom: spacing.xs,
  },
  walletHeroAmt: {
    fontSize: 28,
    fontWeight: '800',
    color: c.gold,
    letterSpacing: -0.5,
  },
  walletHeroHint: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginTop: spacing.sm,
  },
  card: {
    marginBottom: spacing.md,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    ...shadows.card,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    flex: 1,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  brandLabel: {
    ...typography.bodyLarge,
    color: c.textPrimary,
    fontWeight: '700',
  },
  meta: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    paddingTop: spacing.md,
  },
  linkBtn: {
    paddingVertical: spacing.xs,
  },
  linkText: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '600',
  },
  linkDanger: {
    color: '#E8A0A0',
  },
  addBtn: {
    marginBottom: spacing.lg,
  },
  appleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgElevated,
  },
  pillOn: {
    borderColor: c.gold,
    backgroundColor: 'rgba(201, 168, 76, 0.15)',
  },
  pillText: {
    ...typography.bodySmall,
    color: c.textMuted,
    fontWeight: '700',
  },
  pillTextOn: {
    color: c.gold,
  },
  addressName: {
    ...typography.bodyLarge,
    color: c.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  addressLine: {
    ...typography.body,
    color: c.textSecondary,
  },
  editAddr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
}));

export default function PaymentScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const [methods, setMethods] = useState(mockPaymentMethods);
  const [applePay, setApplePay] = useState(true);
  const creditTotal = useMemo(() => mockWalletCredits.reduce((s, cr) => s + cr.amount, 0), []);

  const setDefault = (id: string) => {
    setMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));
  };

  const removeCard = (m: PaymentMethod) => {
    Alert.alert('Remove card', `Remove Visa •••• ${m.last4}?`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => setMethods((prev) => prev.filter((x) => x.id !== m.id)),
      },
    ]);
  };

  return (
    <ProfileStackScreen title={t('profile.paymentMethods')} subtitle={t('profile.paymentMethodsSub')}>
      <LinearGradient
        colors={['#1E1A12', '#12100C', '#0A0A0A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.walletHero}
      >
        <Text style={styles.walletHeroLabel}>Cenaiva credits</Text>
        <Text style={styles.walletHeroAmt}>{formatCurrency(creditTotal, 'CAD')}</Text>
        <Text style={styles.walletHeroHint}>Applied automatically at checkout when eligible</Text>
      </LinearGradient>

      <ProfileSectionTitle>Payment methods</ProfileSectionTitle>
      {methods.map((m) => (
        <Card key={m.id} style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.cardLeft}>
              <View style={styles.brandIcon}>
                <Ionicons name="card" size={22} color={c.gold} />
              </View>
              <View>
                <Text style={styles.brandLabel}>
                  {m.brand === 'visa' ? 'Visa' : m.brand === 'mastercard' ? 'Mastercard' : 'Card'} ···· {m.last4}
                </Text>
                <Text style={styles.meta}>
                  {m.cardholder} · Exp {m.expiry}
                </Text>
              </View>
            </View>
            {m.isDefault ? <Badge label="Default" variant="gold" size="sm" /> : null}
          </View>
          <View style={styles.cardActions}>
            {!m.isDefault ? (
              <Pressable onPress={() => setDefault(m.id)} style={styles.linkBtn}>
                <Text style={styles.linkText}>Set as default</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => {}} style={styles.linkBtn}>
              <Text style={styles.linkText}>Edit</Text>
            </Pressable>
            <Pressable onPress={() => removeCard(m)} style={styles.linkBtn}>
              <Text style={[styles.linkText, styles.linkDanger]}>Remove</Text>
            </Pressable>
          </View>
        </Card>
      ))}

      <Button title="Add new card" onPress={() => {}} variant="outlined" size="md" style={styles.addBtn} />

      <ProfileSectionTitle>Digital wallet</ProfileSectionTitle>
      <Card style={styles.card}>
        <View style={styles.appleRow}>
          <View style={styles.cardLeft}>
            <Ionicons name="logo-apple" size={24} color={c.textPrimary} />
            <View>
              <Text style={styles.brandLabel}>Apple Pay</Text>
              <Text style={styles.meta}>Pay in one tap at participating restaurants</Text>
            </View>
          </View>
          <Pressable
            onPress={() => setApplePay(!applePay)}
            style={[styles.pill, applePay && styles.pillOn]}
          >
            <Text style={[styles.pillText, applePay && styles.pillTextOn]}>{applePay ? 'On' : 'Off'}</Text>
          </Pressable>
        </View>
      </Card>

      <ProfileSectionTitle>Billing address</ProfileSectionTitle>
      <Card style={styles.card}>
        <Text style={styles.addressName}>Alex Johnson</Text>
        <Text style={styles.addressLine}>881 Minchin Way</Text>
        <Text style={styles.addressLine}>Milton, ON L9T 0J5</Text>
        <Text style={styles.addressLine}>Canada</Text>
        <Pressable style={styles.editAddr} onPress={() => {}}>
          <Text style={styles.linkText}>Edit billing address</Text>
          <ChevronGlyph color={c.gold} size={16} />
        </Pressable>
      </Card>
    </ProfileStackScreen>
  );
}
