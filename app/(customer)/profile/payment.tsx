import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ChevronGlyph } from '@/components/ui/ChevronGlyph';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { ProfileSectionTitle } from '@/components/profile/ProfileSectionTitle';
import { Card, Button, Badge } from '@/components/ui';
import { mockWalletCredits } from '@/lib/mock/profileScreens';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { resolveAuthDisplayProfile } from '@/lib/auth/displayProfile';
import { inferCardBrand } from '@/lib/storage/restaurantPaymentMethod';
import {
  getStoredCustomerPaymentMethods,
  removeCustomerPaymentMethod,
  saveCustomerPaymentMethod,
  setDefaultCustomerPaymentMethod,
  type CustomerPaymentMethod as PaymentMethod,
} from '@/lib/storage/customerPaymentMethods';
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
  addForm: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  formTitle: {
    ...typography.bodyLarge,
    color: c.textPrimary,
    fontWeight: '800',
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1,
  },
  fieldInput: {
    ...typography.body,
    color: c.textPrimary,
    minHeight: 44,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  fieldError: {
    ...typography.bodySmall,
    color: c.danger,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  formAction: {
    flex: 1,
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

function brandLabel(brand: PaymentMethod['brand']): string {
  if (brand === 'visa') return 'Visa';
  if (brand === 'mastercard') return 'Mastercard';
  if (brand === 'amex') return 'Amex';
  return 'Card';
}

function sanitizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function formatCardNumber(value: string): string {
  const digits = sanitizeDigits(value).slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatExpiry(value: string): string {
  const digits = sanitizeDigits(value).slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function PaymentScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const { user } = useAuthSession();
  const profile = useMemo(
    () => resolveAuthDisplayProfile(user, { fullName: 'Cardholder' }),
    [user],
  );
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [applePay, setApplePay] = useState(true);
  const [addingCard, setAddingCard] = useState(false);
  const [cardholder, setCardholder] = useState(profile.fullName);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [errors, setErrors] = useState<{
    cardholder?: string;
    cardNumber?: string;
    expiry?: string;
    cvc?: string;
    postalCode?: string;
  }>({});
  const creditTotal = useMemo(() => mockWalletCredits.reduce((s, cr) => s + cr.amount, 0), []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const stored = await getStoredCustomerPaymentMethods(profile.fullName);
      if (active) setMethods(stored);
    })();
    return () => {
      active = false;
    };
  }, [profile.fullName]);

  useEffect(() => {
    setCardholder((current) => (current.trim() ? current : profile.fullName));
  }, [profile.fullName]);

  const setDefault = (id: string) => {
    void (async () => {
      const next = await setDefaultCustomerPaymentMethod(id, profile.fullName);
      setMethods(next);
    })();
  };

  const removeCard = (m: PaymentMethod) => {
    Alert.alert('Remove card', `Remove ${brandLabel(m.brand)} •••• ${m.last4}?`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const next = await removeCustomerPaymentMethod(m.id, profile.fullName);
            setMethods(next);
          })();
        },
      },
    ]);
  };

  const resetForm = () => {
    setCardholder(profile.fullName);
    setCardNumber('');
    setExpiry('');
    setCvc('');
    setPostalCode('');
    setErrors({});
  };

  const saveCard = () => {
    const digits = sanitizeDigits(cardNumber);
    const cvcDigits = sanitizeDigits(cvc);
    const expMatch = expiry.trim().match(/^(\d{2})\s*\/\s*(\d{2}|\d{4})$/);
    const nextErrors: typeof errors = {};

    if (!cardholder.trim()) nextErrors.cardholder = 'Cardholder name is required.';
    if (digits.length < 13 || digits.length > 19) nextErrors.cardNumber = 'Enter a valid card number.';
    if (!expMatch) nextErrors.expiry = 'Use MM/YY for the expiration date.';
    if (cvcDigits.length < 3 || cvcDigits.length > 4) nextErrors.cvc = 'Enter a 3 or 4 digit CVC.';
    if (!postalCode.trim()) nextErrors.postalCode = 'Billing postal code is required.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    void (async () => {
      const next = await saveCustomerPaymentMethod(
        {
          brand: inferCardBrand(digits),
          last4: digits.slice(-4),
          expiry: expiry.trim(),
          cardholder: cardholder.trim(),
          isDefault: true,
        },
        profile.fullName,
      );
      setMethods(next);
      setAddingCard(false);
      resetForm();
    })();
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
                  {brandLabel(m.brand)} ···· {m.last4}
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
            <Pressable
              onPress={() => {
                Alert.alert(
                  'Edit card',
                  'For security, add a new card to replace this payment method, then remove the old one.',
                );
              }}
              style={styles.linkBtn}
            >
              <Text style={styles.linkText}>Edit</Text>
            </Pressable>
            <Pressable onPress={() => removeCard(m)} style={styles.linkBtn}>
              <Text style={[styles.linkText, styles.linkDanger]}>Remove</Text>
            </Pressable>
          </View>
        </Card>
      ))}

      <Button
        title={addingCard ? 'Cancel add card' : 'Add new card'}
        onPress={() => {
          if (addingCard) resetForm();
          setAddingCard((open) => !open);
        }}
        variant="outlined"
        size="md"
        style={styles.addBtn}
      />

      {addingCard ? (
        <Card style={StyleSheet.flatten([styles.card, styles.addForm])}>
          <Text style={styles.formTitle}>Add card</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>CARDHOLDER NAME</Text>
            <TextInput
              value={cardholder}
              onChangeText={(value) => {
                setCardholder(value);
                if (errors.cardholder) setErrors((prev) => ({ ...prev, cardholder: undefined }));
              }}
              placeholder={profile.fullName}
              placeholderTextColor={c.textMuted}
              style={styles.fieldInput}
              autoCapitalize="words"
            />
            {errors.cardholder ? <Text style={styles.fieldError}>{errors.cardholder}</Text> : null}
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>CARD NUMBER</Text>
            <TextInput
              value={cardNumber}
              onChangeText={(value) => {
                setCardNumber(formatCardNumber(value));
                if (errors.cardNumber) setErrors((prev) => ({ ...prev, cardNumber: undefined }));
              }}
              placeholder="4242 4242 4242 4242"
              placeholderTextColor={c.textMuted}
              style={styles.fieldInput}
              keyboardType="number-pad"
            />
            {errors.cardNumber ? <Text style={styles.fieldError}>{errors.cardNumber}</Text> : null}
          </View>
          <View style={styles.formRow}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>EXPIRY</Text>
              <TextInput
                value={expiry}
                onChangeText={(value) => {
                  setExpiry(formatExpiry(value));
                  if (errors.expiry) setErrors((prev) => ({ ...prev, expiry: undefined }));
                }}
                placeholder="MM/YY"
                placeholderTextColor={c.textMuted}
                style={styles.fieldInput}
                keyboardType="number-pad"
              />
              {errors.expiry ? <Text style={styles.fieldError}>{errors.expiry}</Text> : null}
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>CVC</Text>
              <TextInput
                value={cvc}
                onChangeText={(value) => {
                  setCvc(sanitizeDigits(value).slice(0, 4));
                  if (errors.cvc) setErrors((prev) => ({ ...prev, cvc: undefined }));
                }}
                placeholder="123"
                placeholderTextColor={c.textMuted}
                style={styles.fieldInput}
                keyboardType="number-pad"
                secureTextEntry
              />
              {errors.cvc ? <Text style={styles.fieldError}>{errors.cvc}</Text> : null}
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>BILLING POSTAL CODE</Text>
            <TextInput
              value={postalCode}
              onChangeText={(value) => {
                setPostalCode(value.toUpperCase());
                if (errors.postalCode) setErrors((prev) => ({ ...prev, postalCode: undefined }));
              }}
              placeholder="M5V 2T6"
              placeholderTextColor={c.textMuted}
              style={styles.fieldInput}
              autoCapitalize="characters"
            />
            {errors.postalCode ? <Text style={styles.fieldError}>{errors.postalCode}</Text> : null}
          </View>
          <View style={styles.formActions}>
            <Button title="Save card" onPress={saveCard} size="md" style={styles.formAction} />
            <Button
              title="Cancel"
              onPress={() => {
                resetForm();
                setAddingCard(false);
              }}
              variant="ghost"
              size="md"
              style={styles.formAction}
            />
          </View>
        </Card>
      ) : null}

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
        <Text style={styles.addressName}>{profile.fullName}</Text>
        <Text style={styles.addressLine}>{profile.email || 'No email on file'}</Text>
        <Text style={styles.addressLine}>{profile.phone || 'No phone number on file'}</Text>
        <Pressable
          style={styles.editAddr}
          onPress={() => Alert.alert('Billing details', 'Billing address editing is coming soon.')}
        >
          <Text style={styles.linkText}>Edit billing address</Text>
          <ChevronGlyph color={c.gold} size={16} />
        </Pressable>
      </Card>
    </ProfileStackScreen>
  );
}
