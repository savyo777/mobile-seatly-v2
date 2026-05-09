import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  CardField,
  useConfirmSetupIntent,
  type CardFieldInput,
} from '@stripe/stripe-react-native';
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
    marginBottom: spacing.md,
  },
  cardField: {
    width: '100%',
    height: 56,
    marginBottom: spacing.sm,
  },
  initLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  initLoaderText: {
    ...typography.bodySmall,
    color: c.textSecondary,
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

type SetupIntentState =
  | { status: 'loading' }
  | { status: 'ready'; clientSecret: string; setupIntentId: string }
  | { status: 'error'; message: string };

export default function RegisterRestaurantCardEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const { confirmSetupIntent } = useConfirmSetupIntent();
  const [saving, setSaving] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [intent, setIntent] = useState<SetupIntentState>({ status: 'loading' });

  const params = useLocalSearchParams<{
    businessName?: string;
    address?: string;
    ownerPhone?: string;
    paymentError?: string;
  }>();

  const input = useMemo(
    () => ({
      businessName: typeof params.businessName === 'string' ? params.businessName : '',
      address: typeof params.address === 'string' ? params.address : '',
      ownerPhone: typeof params.ownerPhone === 'string' ? params.ownerPhone : '',
    }),
    [params.address, params.businessName, params.ownerPhone],
  );

  // Create the SetupIntent on screen mount so the inline card form is ready
  // to confirm the moment the user taps Save. Re-runs only when the form
  // data changes (which won't happen mid-screen).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await initRestaurantRegistrationPaymentSheet(input);
        if (cancelled) return;
        setIntent({
          status: 'ready',
          clientSecret: result.setupIntentClientSecret,
          setupIntentId: result.setupIntentId,
        });
      } catch (error) {
        if (cancelled) return;
        setIntent({
          status: 'error',
          message: error instanceof Error ? error.message : 'Could not prepare card form.',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [input]);

  const onSubmit = () => {
    void (async () => {
      if (saving) return;
      if (intent.status !== 'ready') {
        Alert.alert('Card form not ready', 'Please wait a moment, then try again.');
        return;
      }
      if (!cardComplete) {
        Alert.alert('Card incomplete', 'Please fill in the card number, expiry, CVC, and postal code.');
        return;
      }
      setSaving(true);
      try {
        const { error: confirmError } = await confirmSetupIntent(intent.clientSecret, {
          paymentMethodType: 'Card',
          paymentMethodData: {
            billingDetails: {
              name: input.businessName.trim() || undefined,
              phone: input.ownerPhone.trim() || undefined,
              address: input.address.trim()
                ? { line1: input.address.trim() }
                : undefined,
            },
          },
        });
        if (confirmError) throw new Error(confirmError.message);

        const preview = await getRestaurantPaymentMethodPreview(intent.setupIntentId);
        const registered = await finalizeRestaurantRegistration(input, intent.setupIntentId);

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
        Alert.alert(
          'Payment setup failed',
          error instanceof Error ? error.message : 'Please try again.',
        );
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <ScreenWrapper withKeyboardAvoiding padded>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 76, spacing['3xl']) },
        ]}
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
            Visa, Mastercard, Debit Visa, or Credit Card. The card is saved for billing after the trial.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Accepted cards</Text>
          <Text style={styles.summaryValue}>Visa, Mastercard, Debit Visa, Credit Card</Text>
          <Text style={styles.summaryText}>
            Card details are processed by Stripe. Cenaiva never sees your full card number.
          </Text>
        </View>

        {typeof params.paymentError === 'string' ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Use the card form below</Text>
            <Text style={styles.errorText}>{params.paymentError}</Text>
          </View>
        ) : null}

        {intent.status === 'error' ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Could not prepare card form</Text>
            <Text style={styles.errorText}>{intent.message}</Text>
          </View>
        ) : null}

        <View style={styles.formCard}>
          <View style={styles.formCardHeader}>
            <Text style={styles.formCardTitle}>Card information</Text>
            <Text style={styles.formCardSub}>
              Enter your card number, expiry, CVC, and postal code.
            </Text>
          </View>

          {intent.status === 'loading' ? (
            <View style={styles.initLoader}>
              <ActivityIndicator color={c.gold} />
              <Text style={styles.initLoaderText}>Preparing secure card form…</Text>
            </View>
          ) : (
            <CardField
              postalCodeEnabled
              placeholders={{
                number: '1234 1234 1234 1234',
                expiration: 'MM/YY',
                cvc: 'CVC',
                postalCode: 'Postal code',
              }}
              cardStyle={{
                backgroundColor: c.bgElevated,
                textColor: c.textPrimary,
                placeholderColor: c.textMuted,
                borderColor: c.border,
                borderWidth: 1,
                borderRadius: borderRadius.lg,
                fontSize: 15,
              }}
              style={styles.cardField}
              onCardChange={(card: CardFieldInput.Details) => setCardComplete(Boolean(card.complete))}
            />
          )}
        </View>

        <View style={styles.footer}>
          <Button
            title={saving ? 'Saving…' : 'Save card'}
            onPress={onSubmit}
            size="lg"
            disabled={saving || intent.status !== 'ready' || !cardComplete}
          />
        </View>

        <View style={styles.secureRow}>
          <Ionicons name="shield-checkmark-outline" size={12} color={c.textMuted} />
          <Text style={styles.secureText}>This card info is used only for Cenaiva billing.</Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
