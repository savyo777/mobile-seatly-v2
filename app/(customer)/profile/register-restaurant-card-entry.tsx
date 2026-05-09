import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  CardForm,
  useConfirmSetupIntent,
  type CardFormView,
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
  // Section heading above the card form
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1.1,
    fontWeight: '700',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  secureBadgeText: {
    ...typography.bodySmall,
    color: c.textMuted,
    fontSize: 11,
  },
  // The wrapper around the Stripe CardForm. CardForm renders separate
  // rows for card number, expiry, CVC, and ZIP — we just give it a clean
  // outer surface and let the native form draw its own row separators.
  formCard: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgElevated,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  cardForm: {
    width: '100%',
    height: 220,
  },
  initLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing['xl'],
    paddingHorizontal: spacing.md,
    height: 220,
    justifyContent: 'center',
  },
  initLoaderText: {
    ...typography.bodySmall,
    color: c.textSecondary,
  },
  // Accepted brands chip row
  brandsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
  },
  brandsLabel: {
    ...typography.bodySmall,
    color: c.textMuted,
    fontSize: 11,
    marginRight: 4,
  },
  brandChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  brandChipText: {
    color: c.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Error states
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
  // Footer area
  footer: {
    marginTop: spacing.sm,
  },
  trialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  trialText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    fontSize: 12,
  },
  trialHighlight: {
    color: c.gold,
    fontWeight: '700',
  },
  trustRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
  },
  trustText: {
    ...typography.bodySmall,
    color: c.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
}));

type SetupIntentState =
  | { status: 'loading' }
  | { status: 'ready'; clientSecret: string; setupIntentId: string }
  | { status: 'error'; message: string };

const ACCEPTED_BRANDS = ['Visa', 'Credit Card', 'Debit Visa', 'Mastercard'] as const;

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

  // Create the SetupIntent on mount so the card form is ready to confirm
  // the moment the user taps Save.
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

        const previewResult = await getRestaurantPaymentMethodPreview(intent.setupIntentId);
        const registered = await finalizeRestaurantRegistration(input, intent.setupIntentId);

        router.replace({
          pathname: '/(customer)/profile/register-restaurant-success',
          params: {
            trialEndsAt: registered.trialEndsAt,
            businessName: input.businessName,
            address: input.address,
            ownerPhone: input.ownerPhone,
            cardBrand: previewResult.brand,
            cardLast4: previewResult.last4,
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
            We'll save it to start your 3-month free trial. You won't be charged today.
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

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Card details</Text>
          <View style={styles.secureBadge}>
            <Ionicons name="lock-closed" size={11} color={c.textMuted} />
            <Text style={styles.secureBadgeText}>Encrypted</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          {intent.status === 'loading' ? (
            <View style={styles.initLoader}>
              <ActivityIndicator color={c.gold} />
              <Text style={styles.initLoaderText}>Preparing secure card form…</Text>
            </View>
          ) : (
            <CardForm
              placeholders={{
                number: 'Card number',
                expiration: 'MM / YY',
                cvc: 'CVC',
                postalCode: 'ZIP',
              }}
              cardStyle={{
                backgroundColor: c.bgElevated,
                textColor: c.textPrimary,
                placeholderColor: c.textMuted,
                borderColor: 'rgba(255,255,255,0.08)',
                borderWidth: 0,
                borderRadius: borderRadius.lg,
                fontSize: 16,
              }}
              style={styles.cardForm}
              onFormComplete={(card: CardFormView.Details) => {
                setCardComplete(Boolean(card.complete));
              }}
            />
          )}
        </View>

        <View style={styles.brandsRow}>
          <Text style={styles.brandsLabel}>We accept</Text>
          {ACCEPTED_BRANDS.map((brand) => (
            <View key={brand} style={styles.brandChip}>
              <Text style={styles.brandChipText}>{brand}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Button
            title={saving ? 'Saving…' : 'Save card & start trial'}
            onPress={onSubmit}
            size="lg"
            disabled={saving || intent.status !== 'ready' || !cardComplete}
          />
        </View>

        <View style={styles.trialRow}>
          <Ionicons name="gift-outline" size={12} color={c.gold} />
          <Text style={styles.trialText}>
            <Text style={styles.trialHighlight}>3 months free</Text> · Cancel anytime
          </Text>
        </View>

        <View style={styles.trustRow}>
          <Ionicons name="shield-checkmark-outline" size={12} color={c.textMuted} />
          <Text style={styles.trustText}>
            Processed by Stripe. Cenaiva never sees your full card number.
          </Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
