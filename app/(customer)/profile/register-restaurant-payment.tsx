import React, { useMemo, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Button, ScreenWrapper } from '@/components/ui';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import {
  finalizeRestaurantRegistration,
  getRestaurantPaymentMethodPreview,
  initRestaurantRegistrationPaymentSheet,
} from '@/lib/services/restaurantRegistration';
import { getStripeEnv } from '@/lib/stripe/env';

const useStyles = createStyles((c) => ({
  inner: { flex: 1, paddingTop: spacing.lg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  backText: { ...typography.body, color: c.textSecondary },
  topRight: { width: 60 },
  title: { ...typography.serifDisplay, color: c.textPrimary, textAlign: 'center', marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: c.textMuted, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 22 },
  summaryCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${c.gold}35`,
    backgroundColor: c.bgSurface,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: { ...typography.bodySmall, color: c.textMuted },
  summaryValue: { ...typography.body, color: c.textPrimary, fontWeight: '700' },
  separator: { height: 1, backgroundColor: c.border, marginVertical: spacing.sm },
  cardPreviewRow: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    padding: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardPreviewText: { ...typography.body, color: c.textPrimary, fontWeight: '700' },
  changeText: { ...typography.bodySmall, color: c.gold, fontWeight: '700' },
  helperText: { ...typography.bodySmall, color: c.textMuted, textAlign: 'center', lineHeight: 19, marginTop: spacing.md },
  secureRow: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secureText: { ...typography.bodySmall, color: c.textMuted },
  fallbackText: { ...typography.bodySmall, color: c.textMuted, lineHeight: 20, marginBottom: spacing.lg, textAlign: 'center' },
}));

export default function RegisterRestaurantPaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);
  const { publishableKey } = getStripeEnv();
  const [setupIntentId, setSetupIntentId] = useState<string | null>(null);
  const [cardPreview, setCardPreview] = useState<{ brand: string; last4: string } | null>(null);

  const params = useLocalSearchParams<{
    hstNumber?: string;
    businessName?: string;
    address?: string;
    ownerPhone?: string;
  }>();
  const hstNumber = typeof params.hstNumber === 'string' ? params.hstNumber : '';
  const businessName = typeof params.businessName === 'string' ? params.businessName : '';
  const address = typeof params.address === 'string' ? params.address : '';
  const ownerPhone = typeof params.ownerPhone === 'string' ? params.ownerPhone : '';

  const trialEndDate = useMemo(() => {
    const dt = new Date();
    dt.setDate(dt.getDate() + 90);
    return dt;
  }, []);
  const trialDateLabel = useMemo(
    () => trialEndDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    [trialEndDate],
  );
  const monthlyPriceLabel = '$49.00';

  const isExpoGo = Constants.appOwnership === 'expo';

  const openPaymentSheet = async () => {
    if (isExpoGo) {
      Alert.alert('Unavailable in Expo Go', 'PaymentSheet requires a development build for native Stripe UI.');
      return;
    }
    if (loadingSheet) return;
    setLoadingSheet(true);
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

      setSetupIntentId(init.setupIntentId);
      const preview = await getRestaurantPaymentMethodPreview(init.setupIntentId);
      setCardPreview(preview);
    } catch (e: any) {
      Alert.alert('Payment setup failed', e?.message ?? 'Could not complete payment setup.');
    } finally {
      setLoadingSheet(false);
    }
  };

  const onStartTrial = async () => {
    if (!setupIntentId || startingTrial) return;
    setStartingTrial(true);
    try {
      const result = await finalizeRestaurantRegistration(
        { hstNumber, businessName, address, ownerPhone },
        setupIntentId,
      );
      router.replace({
        pathname: '/(customer)/profile/register-restaurant-success',
        params: { trialEndsAt: result.trialEndsAt },
      });
    } catch (e: any) {
      Alert.alert('Registration failed', e?.message ?? 'Could not start your free trial.');
    } finally {
      setStartingTrial(false);
    }
  };

  return (
    <ScreenWrapper padded>
      <View style={[styles.inner, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7} hitSlop={12}>
            <Ionicons name="chevron-back" size={20} color={c.textSecondary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={{ color: c.gold, fontWeight: '700', letterSpacing: 4 }}>CENAIVA</Text>
          <View style={styles.topRight} />
        </View>

        <Text style={styles.title}>Start your free trial</Text>
        <Text style={styles.subtitle}>3 months free, then {monthlyPriceLabel}/month. Cancel anytime.</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Today</Text>
            <Text style={styles.summaryValue}>$0.00</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>After {trialDateLabel}</Text>
            <Text style={styles.summaryValue}>{monthlyPriceLabel}/month</Text>
          </View>
        </View>

        {cardPreview ? (
          <View style={styles.cardPreviewRow}>
            <Text style={styles.cardPreviewText}>{cardPreview.brand} •••• {cardPreview.last4}</Text>
            <TouchableOpacity onPress={openPaymentSheet} hitSlop={8}>
              <Text style={styles.changeText}>Change</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {isExpoGo ? (
          <Text style={styles.fallbackText}>
            Stripe PaymentSheet is unavailable in Expo Go. Use a development build to open native card collection.
          </Text>
        ) : null}

        {!cardPreview ? (
          <Button title="Add payment method" onPress={openPaymentSheet} size="lg" loading={loadingSheet} />
        ) : (
          <Button title="Start 3-month free trial" onPress={onStartTrial} size="lg" loading={startingTrial} />
        )}

        <Text style={styles.helperText}>
          You won't be charged until {trialDateLabel}. Cancel anytime in Settings.
        </Text>
        <View style={styles.secureRow}>
          <Ionicons name="lock-closed-outline" size={12} color={c.textMuted} />
          <Text style={styles.secureText}>Secured by Stripe</Text>
        </View>

      </View>
    </ScreenWrapper>
  );
}
