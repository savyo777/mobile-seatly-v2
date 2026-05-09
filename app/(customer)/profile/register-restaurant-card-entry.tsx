import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { Button, ScreenWrapper } from '@/components/ui';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import {
  finalizeRestaurantRegistration,
  getRestaurantPaymentMethodPreview,
  initRestaurantRegistrationPaymentSheet,
} from '@/lib/services/restaurantRegistration';

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
  stripeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgElevated,
    padding: spacing.md,
  },
  stripeIcon: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,168,76,0.12)',
  },
  stripeTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  stripeText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginTop: 2,
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

export default function RegisterRestaurantCardEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [saving, setSaving] = useState(false);

  const params = useLocalSearchParams<{
    businessName?: string;
    address?: string;
    ownerPhone?: string;
    paymentError?: string;
  }>();

  const input = useMemo(() => ({
    businessName: typeof params.businessName === 'string' ? params.businessName : '',
    address: typeof params.address === 'string' ? params.address : '',
    ownerPhone: typeof params.ownerPhone === 'string' ? params.ownerPhone : '',
  }), [params.address, params.businessName, params.ownerPhone]);

  const onContinue = () => {
    void (async () => {
      if (saving) return;
      setSaving(true);
      try {
        const paymentSheet = await initRestaurantRegistrationPaymentSheet(input);
        const initResult = await initPaymentSheet({
          merchantDisplayName: 'Cenaiva',
          customerId: paymentSheet.customerId,
          customerEphemeralKeySecret: paymentSheet.customerEphemeralKeySecret,
          setupIntentClientSecret: paymentSheet.setupIntentClientSecret,
          allowsDelayedPaymentMethods: false,
          returnURL: 'cenaiva://stripe-redirect',
        });
        if (initResult.error) throw new Error(initResult.error.message);

        const presentResult = await presentPaymentSheet();
        if (presentResult.error) {
          if (presentResult.error.code === 'Canceled') return;
          throw new Error(presentResult.error.message);
        }

        const preview = await getRestaurantPaymentMethodPreview(paymentSheet.setupIntentId);
        const registered = await finalizeRestaurantRegistration(input, paymentSheet.setupIntentId);

        router.replace({
          pathname: '/(customer)/profile/register-restaurant-success',
          params: {
            trialEndsAt: registered.trialEndsAt,
            businessName: input.businessName,
            address: input.address,
            ownerPhone: input.ownerPhone,
            cardBrand: preview.brand,
            cardLast4: preview.last4,
          },
        });
      } catch (error) {
        Alert.alert('Payment setup failed', error instanceof Error ? error.message : 'Please try again.');
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <ScreenWrapper withKeyboardAvoiding padded>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 76, spacing['3xl']) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
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
            <Text style={styles.formCardTitle}>Secure card setup</Text>
            <Text style={styles.formCardSub}>
              Cenaiva uses Stripe to save your billing card. The card details are collected in Stripe's secure form and are not stored on this device.
            </Text>
          </View>

          <View style={styles.stripeRow}>
            <View style={styles.stripeIcon}>
              <Ionicons name="card-outline" size={20} color={c.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stripeTitle}>Open Stripe payment sheet</Text>
              <Text style={styles.stripeText}>Add or confirm the card used after the free trial.</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Button title={saving ? 'Opening secure form...' : 'Add payment method'} onPress={onContinue} size="lg" disabled={saving} />
        </View>

        <View style={styles.secureRow}>
          <Ionicons name="shield-checkmark-outline" size={12} color={c.textMuted} />
          <Text style={styles.secureText}>This card info is used only for Cenaiva billing.</Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
