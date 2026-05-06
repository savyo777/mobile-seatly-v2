import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, ScreenWrapper } from '@/components/ui';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import { addCalendarMonths } from '@/lib/services/restaurantRegistration';

const useStyles = createStyles((c) => ({
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: spacing['3xl'],
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backText: {
    ...typography.body,
    color: c.textSecondary,
  },
  topRight: {
    width: 60,
  },
  titleWrap: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  eyebrow: {
    ...typography.label,
    color: c.gold,
    letterSpacing: 1.1,
    fontWeight: '700',
  },
  title: {
    ...typography.h2,
    color: c.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 22,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: spacing.lg,
  },
  noteText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  summaryCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  summaryLabel: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1,
  },
  summaryValue: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  summaryText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 18,
  },
  formCard: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  formCardHeader: {
    marginBottom: spacing.md,
    gap: 3,
  },
  formCardTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  formCardSub: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 18,
  },
  errorCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    backgroundColor: 'rgba(239,68,68,0.08)',
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: 6,
  },
  errorTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  errorText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 18,
  },
  footer: {
    marginTop: spacing.sm,
  },
  secureRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secureText: {
    ...typography.bodySmall,
    color: c.textMuted,
  },
}));

function sanitizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export default function RegisterRestaurantCardEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [errors, setErrors] = useState<{
    cardholderName?: string;
    cardNumber?: string;
    expiry?: string;
    cvc?: string;
    postalCode?: string;
  }>({});

  const params = useLocalSearchParams<{
    hstNumber?: string;
    businessName?: string;
    address?: string;
    ownerPhone?: string;
    paymentError?: string;
  }>();

  const trialEndsAt = useMemo(() => addCalendarMonths(new Date(), 3).toISOString(), []);

  const onContinue = () => {
    const digits = sanitizeDigits(cardNumber);
    const cvcDigits = sanitizeDigits(cvc);
    const expMatch = expiry.trim().match(/^(\d{2})\s*\/\s*(\d{2}|\d{4})$/);
    const zip = postalCode.trim();

    const nextErrors: typeof errors = {};
    if (!cardholderName.trim()) nextErrors.cardholderName = 'Cardholder name is required.';
    if (digits.length < 13 || digits.length > 19) nextErrors.cardNumber = 'Enter a valid card number.';
    if (!expMatch) nextErrors.expiry = 'Use MM/YY for the expiration date.';
    if (cvcDigits.length < 3 || cvcDigits.length > 4) nextErrors.cvc = 'Enter a 3 or 4 digit CVC.';
    if (!zip) nextErrors.postalCode = 'Billing postal code is required.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    router.replace({
      pathname: '/(customer)/profile/register-restaurant-payment',
      params: {
        hstNumber: typeof params.hstNumber === 'string' ? params.hstNumber : '',
        businessName: typeof params.businessName === 'string' ? params.businessName : '',
        address: typeof params.address === 'string' ? params.address : '',
        ownerPhone: typeof params.ownerPhone === 'string' ? params.ownerPhone : '',
        paymentMode: 'manual',
        setupIntentId: `manual_${Date.now()}`,
        cardBrand: 'Card',
        cardLast4: digits.slice(-4),
        trialEndsAt,
      },
    });
  };

  return (
    <ScreenWrapper padded>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={20} color={c.textSecondary} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={{ color: c.gold, fontWeight: '700', letterSpacing: 4 }}>CENAIVA</Text>
          <View style={styles.topRight} />
        </View>

        <View style={styles.titleWrap}>
          <Text style={styles.eyebrow}>Payment details</Text>
          <Text style={styles.title}>Enter your card info</Text>
          <Text style={styles.subtitle}>
            Add a card to continue the restaurant registration and start the 3-month free trial.
          </Text>
        </View>

        <View style={styles.noteRow}>
          <Ionicons name="lock-closed-outline" size={14} color={c.gold} />
          <Text style={styles.noteText}>
            Use a Visa, Mastercard, debit Visa, or credit card. The card is saved for billing after the trial.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Accepted cards</Text>
          <Text style={styles.summaryValue}>Visa, Mastercard, Debit Visa, Credit Card</Text>
          <Text style={styles.summaryText}>
            Add the card you want on file for Cenaiva billing after the free trial ends.
          </Text>
        </View>

        {typeof params.paymentError === 'string' ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Use the card form below</Text>
            <Text style={styles.errorText}>{params.paymentError}</Text>
          </View>
        ) : null}

        <View style={styles.formCard}>
          <View style={styles.formCardHeader}>
            <Text style={styles.formCardTitle}>Card details</Text>
            <Text style={styles.formCardSub}>
              Enter the payment information exactly as it appears on the card.
            </Text>
          </View>

          <Input
            label="Cardholder name"
            placeholder="Alex Johnson"
            value={cardholderName}
            onChangeText={(value) => {
              setCardholderName(value);
              if (errors.cardholderName) setErrors((prev) => ({ ...prev, cardholderName: undefined }));
            }}
            icon="person-outline"
            error={errors.cardholderName}
            autoCapitalize="words"
          />
          <Input
            label="Card number"
            placeholder="4242 4242 4242 4242"
            value={cardNumber}
            onChangeText={(value) => {
              setCardNumber(value);
              if (errors.cardNumber) setErrors((prev) => ({ ...prev, cardNumber: undefined }));
            }}
            icon="card-outline"
            keyboardType="number-pad"
            error={errors.cardNumber}
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Expiry date"
                placeholder="MM/YY"
                value={expiry}
                onChangeText={(value) => {
                  setExpiry(value);
                  if (errors.expiry) setErrors((prev) => ({ ...prev, expiry: undefined }));
                }}
                icon="calendar-outline"
                keyboardType="numbers-and-punctuation"
                error={errors.expiry}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="CVC"
                placeholder="123"
                value={cvc}
                onChangeText={(value) => {
                  setCvc(value);
                  if (errors.cvc) setErrors((prev) => ({ ...prev, cvc: undefined }));
                }}
                icon="lock-closed-outline"
                keyboardType="number-pad"
                error={errors.cvc}
              />
            </View>
          </View>
          <Input
            label="Billing postal code"
            placeholder="M5V 2T6"
            value={postalCode}
            onChangeText={(value) => {
              setPostalCode(value);
              if (errors.postalCode) setErrors((prev) => ({ ...prev, postalCode: undefined }));
            }}
            icon="location-outline"
            autoCapitalize="characters"
            error={errors.postalCode}
          />
        </View>

        <View style={styles.footer}>
          <Button title="Save card and continue" onPress={onContinue} size="lg" />
        </View>

        <View style={styles.secureRow}>
          <Ionicons name="shield-checkmark-outline" size={12} color={c.textMuted} />
          <Text style={styles.secureText}>This card info is used only for Cenaiva billing.</Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
