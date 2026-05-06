import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Button, ScreenWrapper } from '@/components/ui';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import {
  getRestaurantPaymentMethodPreview,
  initRestaurantRegistrationPaymentSheet,
} from '@/lib/services/restaurantRegistration';
import { getStripeEnv } from '@/lib/stripe/env';

const useStyles = createStyles((c) => ({
  inner: { flex: 1, paddingTop: spacing.lg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  backText: { ...typography.body, color: c.textSecondary },
  topRight: { width: 60 },
  hero: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    backgroundColor: c.bgSurface,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  heroKicker: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.25)',
  },
  heroKickerText: {
    ...typography.label,
    color: c.gold,
    fontWeight: '700',
  },
  title: { ...typography.h2, color: c.textPrimary },
  subtitle: { ...typography.body, color: c.textSecondary, lineHeight: 22 },
  stepList: {
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  stepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
    marginTop: 1,
  },
  stepTextWrap: {
    flex: 1,
  },
  stepTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  stepCopy: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  inputCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  inputCardTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  inputCardText: {
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
  secureRow: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secureText: { ...typography.bodySmall, color: c.textMuted },
}));

export default function RegisterRestaurantPaymentMethodScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { publishableKey } = getStripeEnv();

  const params = useLocalSearchParams<{
    hstNumber?: string;
    businessName?: string;
    address?: string;
    ownerPhone?: string;
    setupIntentId?: string;
    cardBrand?: string;
    cardLast4?: string;
    paymentError?: string;
  }>();

  const hstNumber = typeof params.hstNumber === 'string' ? params.hstNumber : '';
  const businessName = typeof params.businessName === 'string' ? params.businessName : '';
  const address = typeof params.address === 'string' ? params.address : '';
  const ownerPhone = typeof params.ownerPhone === 'string' ? params.ownerPhone : '';

  const isExpoGo = Constants.appOwnership === 'expo';

  const openPaymentSheet = async () => {
    if (isExpoGo) {
      setErrorMessage('Stripe PaymentSheet requires a Cenaiva development build. Expo Go cannot open the secure card sheet.');
      return;
    }
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const stripe = await import('@stripe/stripe-react-native');
      await stripe.initStripe({ publishableKey });

      const init = await initRestaurantRegistrationPaymentSheet({
        hstNumber,
        businessName,
        address,
        ownerPhone,
      });

      const initResult = await stripe.initPaymentSheet({
        merchantDisplayName: 'CENAIVA',
        customerId: init.customerId,
        customerEphemeralKeySecret: init.customerEphemeralKeySecret,
        setupIntentClientSecret: init.setupIntentClientSecret,
        allowsDelayedPaymentMethods: false,
        applePay: {
          merchantCountryCode: 'CA',
        },
        googlePay: {
          merchantCountryCode: 'CA',
          currencyCode: 'CAD',
          testEnv: true,
        },
      });
      if (initResult.error) {
        throw new Error(initResult.error.message ?? 'Failed to initialize payment sheet.');
      }

      const presentResult = await stripe.presentPaymentSheet();
      if (presentResult.error) {
        if (presentResult.error.code === 'Canceled') return;
        throw new Error(presentResult.error.message ?? 'Failed to collect payment method.');
      }

      let preview: { brand: string; last4: string } | null = null;
      try {
        preview = await getRestaurantPaymentMethodPreview(init.setupIntentId);
      } catch {
        preview = null;
      }
      router.replace({
        pathname: '/(customer)/profile/register-restaurant-payment',
        params: {
          hstNumber,
          businessName,
          address,
          ownerPhone,
          setupIntentId: init.setupIntentId,
          ...(preview
            ? {
                cardBrand: preview.brand,
                cardLast4: preview.last4,
              }
            : {}),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not complete payment setup.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper padded>
      <ScrollView
        style={styles.inner}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.lg) }}
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

        <View style={styles.hero}>
          <View style={styles.heroKicker}>
            <Ionicons name="card-outline" size={14} color={c.gold} />
            <Text style={styles.heroKickerText}>Secure card step</Text>
          </View>
          <Text style={styles.title}>Add a payment method</Text>
          <Text style={styles.subtitle}>
            This opens Stripe’s secure card sheet so Cenaiva can keep the restaurant trial and billing on file.
          </Text>
        </View>

        <View style={styles.stepList}>
          <View style={styles.stepRow}>
            <View style={styles.stepIcon}>
              <Ionicons name="shield-checkmark-outline" size={15} color={c.gold} />
            </View>
            <View style={styles.stepTextWrap}>
              <Text style={styles.stepTitle}>Protected by Stripe</Text>
              <Text style={styles.stepCopy}>Your card details are collected through Stripe’s native payment sheet.</Text>
            </View>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepIcon}>
              <Ionicons name="card-outline" size={15} color={c.gold} />
            </View>
            <View style={styles.stepTextWrap}>
              <Text style={styles.stepTitle}>Required before the trial starts</Text>
              <Text style={styles.stepCopy}>Once the card is saved, you return to the trial screen and finish the setup.</Text>
            </View>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepIcon}>
              <Ionicons name="sparkles-outline" size={15} color={c.gold} />
            </View>
            <View style={styles.stepTextWrap}>
              <Text style={styles.stepTitle}>One small step forward</Text>
              <Text style={styles.stepCopy}>This keeps the flow clear instead of dropping users into a generic error message.</Text>
            </View>
          </View>
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.inputCardTitle}>What happens next</Text>
          <Text style={styles.inputCardText}>
            We open the secure card sheet, save the payment method, and bring you back to start the 3-month free trial.
          </Text>
        </View>

        {errorMessage || typeof params.paymentError === 'string' ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Payment setup needs one more step</Text>
            <Text style={styles.errorText}>{errorMessage ?? params.paymentError}</Text>
          </View>
        ) : null}

        <Button
          title={loading ? 'Opening payment sheet' : 'Open secure payment sheet'}
          onPress={() => void openPaymentSheet()}
          loading={loading}
          size="lg"
        />

        <Button
          title="Back to trial summary"
          variant="outlined"
          onPress={() => router.replace({
            pathname: '/(customer)/profile/register-restaurant-payment',
            params: {
              hstNumber,
              businessName,
              address,
              ownerPhone,
              ...(typeof params.setupIntentId === 'string'
                ? {
                    setupIntentId: params.setupIntentId,
                    cardBrand: typeof params.cardBrand === 'string' ? params.cardBrand : '',
                    cardLast4: typeof params.cardLast4 === 'string' ? params.cardLast4 : '',
                  }
                : {}),
            },
          })}
          size="lg"
          style={{ marginTop: spacing.sm }}
        />

        <View style={styles.secureRow}>
          <Ionicons name="lock-closed-outline" size={12} color={c.textMuted} />
          <Text style={styles.secureText}>Secure checkout powered by Stripe</Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
