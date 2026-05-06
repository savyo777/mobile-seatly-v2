import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, ScreenWrapper } from '@/components/ui';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import { addCalendarMonths, finalizeRestaurantRegistration } from '@/lib/services/restaurantRegistration';

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
  paymentCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  paymentCardLabel: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1.1,
  },
  paymentCardText: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  paymentCardSub: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 19,
  },
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
  helperText: {
    ...typography.bodySmall,
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: spacing.md,
  },
  secureRow: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secureText: { ...typography.bodySmall, color: c.textMuted },
}));

export default function RegisterRestaurantPaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const [startingTrial, setStartingTrial] = useState(false);

  const params = useLocalSearchParams<{
    hstNumber?: string;
    businessName?: string;
    address?: string;
    ownerPhone?: string;
    setupIntentId?: string;
    cardBrand?: string;
    cardLast4?: string;
  }>();

  const hstNumber = typeof params.hstNumber === 'string' ? params.hstNumber : '';
  const businessName = typeof params.businessName === 'string' ? params.businessName : '';
  const address = typeof params.address === 'string' ? params.address : '';
  const ownerPhone = typeof params.ownerPhone === 'string' ? params.ownerPhone : '';
  const setupIntentId = typeof params.setupIntentId === 'string' ? params.setupIntentId : '';
  const cardBrand = typeof params.cardBrand === 'string' ? params.cardBrand : '';
  const cardLast4 = typeof params.cardLast4 === 'string' ? params.cardLast4 : '';

  const trialEndDate = useMemo(() => addCalendarMonths(new Date(), 3), []);
  const trialDateLabel = useMemo(
    () => trialEndDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    [trialEndDate],
  );
  const monthlyPriceLabel = '$49.00';
  const hasPaymentMethod = Boolean(setupIntentId);
  const hasCardPreview = Boolean(setupIntentId && cardBrand && cardLast4);

  const goToPaymentMethodStep = () => {
    router.push({
      pathname: '/(customer)/profile/register-restaurant-payment-method',
      params: {
        hstNumber,
        businessName,
        address,
        ownerPhone,
        ...(setupIntentId
          ? {
              setupIntentId,
              cardBrand,
              cardLast4,
            }
          : {}),
      },
    });
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
    } catch {
      router.push({
        pathname: '/(customer)/profile/register-restaurant-payment-method',
        params: {
          hstNumber,
          businessName,
          address,
          ownerPhone,
          setupIntentId,
          cardBrand,
          cardLast4,
          paymentError: 'We could not start the trial yet. Please confirm your card setup first.',
        },
      });
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

        <View style={styles.hero}>
          <View style={styles.heroKicker}>
            <Ionicons name="calendar-outline" size={14} color={c.gold} />
            <Text style={styles.heroKickerText}>Free trial setup</Text>
          </View>
          <Text style={styles.title}>Start your free trial</Text>
          <Text style={styles.subtitle}>3 months free, then {monthlyPriceLabel}/month. Cancel anytime.</Text>
        </View>

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

        <View style={styles.stepList}>
          <View style={styles.stepRow}>
            <View style={styles.stepIcon}>
              <Ionicons name="shield-checkmark-outline" size={15} color={c.gold} />
            </View>
            <View style={styles.stepTextWrap}>
              <Text style={styles.stepTitle}>Secure card setup</Text>
              <Text style={styles.stepCopy}>
                We open Stripe’s native card sheet so your billing method stays protected.
              </Text>
            </View>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepIcon}>
              <Ionicons name="card-outline" size={15} color={c.gold} />
            </View>
            <View style={styles.stepTextWrap}>
              <Text style={styles.stepTitle}>No charge today</Text>
              <Text style={styles.stepCopy}>
                The card is collected now, but the trial stays at $0.00 until the exact 3-month date.
              </Text>
            </View>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepIcon}>
              <Ionicons name="sparkles-outline" size={15} color={c.gold} />
            </View>
            <View style={styles.stepTextWrap}>
              <Text style={styles.stepTitle}>Finish the restaurant launch</Text>
              <Text style={styles.stepCopy}>
                Once the payment method is saved, Cenaiva can finish the restaurant registration.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.paymentCard}>
          <Text style={styles.paymentCardLabel}>Payment method</Text>
          <Text style={styles.paymentCardText}>
            {hasCardPreview
              ? `${cardBrand} •••• ${cardLast4}`
              : hasPaymentMethod
                ? 'Payment method added'
                : 'No payment method added yet'}
          </Text>
          <Text style={styles.paymentCardSub}>
            {hasCardPreview
              ? 'You can change the payment method before starting the trial.'
              : hasPaymentMethod
                ? 'The payment method is saved and ready for the trial.'
              : 'Tap below to open the secure payment step and add a card.'}
          </Text>
        </View>

        {hasPaymentMethod ? (
          <View style={styles.cardPreviewRow}>
            <Text style={styles.cardPreviewText}>
              {hasCardPreview ? `${cardBrand} •••• ${cardLast4}` : 'Payment method added'}
            </Text>
            <TouchableOpacity onPress={goToPaymentMethodStep} hitSlop={8}>
              <Text style={styles.changeText}>Change</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!hasCardPreview ? (
          <Button title="Add payment method" onPress={goToPaymentMethodStep} size="lg" />
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
