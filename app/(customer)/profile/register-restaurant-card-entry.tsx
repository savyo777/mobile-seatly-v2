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
  // Live card preview
  cardPreview: {
    height: 200,
    borderRadius: 20,
    padding: 20,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    backgroundColor: '#0B0B0B',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.35)',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardPreviewSheen: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: 'rgba(201,168,76,0.10)',
  },
  cardPreviewSheen2: {
    position: 'absolute',
    bottom: -80,
    left: -40,
    width: 240,
    height: 240,
    borderRadius: 240,
    backgroundColor: 'rgba(201,168,76,0.05)',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardWordmark: {
    color: c.gold,
    fontWeight: '700',
    letterSpacing: 3,
    fontSize: 12,
  },
  cardChip: {
    width: 36,
    height: 26,
    borderRadius: 5,
    backgroundColor: 'rgba(201,168,76,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.45)',
    overflow: 'hidden',
  },
  cardChipInner: {
    position: 'absolute',
    top: 6,
    left: 4,
    right: 4,
    bottom: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.55)',
  },
  cardNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  cardNumberGroup: {
    color: c.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardMicroLabel: {
    ...typography.label,
    color: c.textMuted,
    fontSize: 9,
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  cardValue: {
    color: c.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  cardBrandPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.45)',
    backgroundColor: 'rgba(201,168,76,0.10)',
  },
  cardBrandText: {
    color: c.gold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  // Form card
  formCard: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  formCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  formCardTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  formCardSecure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  formCardSecureText: {
    ...typography.bodySmall,
    color: c.textMuted,
    fontSize: 11,
  },
  cardField: {
    width: '100%',
    height: 60,
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
  // Brand chips
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
  // Error
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
  // Footer
  footer: {
    marginTop: spacing.sm,
  },
  trustRow: {
    marginTop: spacing.md,
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
  trialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
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
}));

type SetupIntentState =
  | { status: 'loading' }
  | { status: 'ready'; clientSecret: string; setupIntentId: string }
  | { status: 'error'; message: string };

type CardPreviewState = {
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  brand: string;
};

const ACCEPTED_BRANDS = ['Visa', 'Mastercard', 'Amex', 'Discover'] as const;

function formatPreviewNumber(last4: string): string {
  const padded = (last4 ?? '').padStart(4, '•');
  return `••••  ••••  ••••  ${padded}`;
}

function formatPreviewExpiry(month: number, year: number): string {
  if (!month && !year) return 'MM / YY';
  const mm = month ? String(month).padStart(2, '0') : 'MM';
  const yy = year ? String(year).slice(-2).padStart(2, '0') : 'YY';
  return `${mm} / ${yy}`;
}

function brandLabel(brand: string): string {
  if (!brand || brand.toLowerCase() === 'unknown') return 'Card';
  // Stripe returns brands like "Visa", "MasterCard", "AmericanExpress"
  return brand
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace('Master Card', 'Mastercard')
    .replace('American Express', 'Amex');
}

export default function RegisterRestaurantCardEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const { confirmSetupIntent } = useConfirmSetupIntent();
  const [saving, setSaving] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [intent, setIntent] = useState<SetupIntentState>({ status: 'loading' });
  const [preview, setPreview] = useState<CardPreviewState>({
    last4: '',
    expiryMonth: 0,
    expiryYear: 0,
    brand: '',
  });

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
  // to confirm the moment the user taps Save.
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

  const previewBrand = brandLabel(preview.brand);
  const previewBusinessName =
    input.businessName.trim().length > 0 ? input.businessName.trim().toUpperCase() : 'CARDHOLDER NAME';

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

        {/* Live card preview */}
        <View style={styles.cardPreview}>
          <View style={styles.cardPreviewSheen} />
          <View style={styles.cardPreviewSheen2} />

          <View style={styles.cardTopRow}>
            <Text style={styles.cardWordmark}>CENAIVA</Text>
            <View style={styles.cardChip}>
              <View style={styles.cardChipInner} />
            </View>
          </View>

          <View style={styles.cardNumberRow}>
            <Text style={styles.cardNumberGroup}>{formatPreviewNumber(preview.last4)}</Text>
          </View>

          <View style={styles.cardBottomRow}>
            <View style={{ flexDirection: 'row', gap: spacing.lg }}>
              <View>
                <Text style={styles.cardMicroLabel}>Cardholder</Text>
                <Text style={styles.cardValue} numberOfLines={1}>
                  {previewBusinessName}
                </Text>
              </View>
              <View>
                <Text style={styles.cardMicroLabel}>Expires</Text>
                <Text style={styles.cardValue}>
                  {formatPreviewExpiry(preview.expiryMonth, preview.expiryYear)}
                </Text>
              </View>
            </View>
            <View style={styles.cardBrandPill}>
              <Text style={styles.cardBrandText}>{previewBrand}</Text>
            </View>
          </View>
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

        {/* Card form */}
        <View style={styles.formCard}>
          <View style={styles.formCardHeader}>
            <Text style={styles.formCardTitle}>Card details</Text>
            <View style={styles.formCardSecure}>
              <Ionicons name="lock-closed" size={11} color={c.textMuted} />
              <Text style={styles.formCardSecureText}>Encrypted</Text>
            </View>
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
                number: 'Card number',
                expiration: 'MM / YY',
                cvc: 'CVC',
                postalCode: 'ZIP',
              }}
              cardStyle={{
                backgroundColor: c.bgElevated,
                textColor: c.textPrimary,
                placeholderColor: c.textMuted,
                borderColor: 'rgba(255,255,255,0.10)',
                borderWidth: 1,
                borderRadius: borderRadius.lg,
                fontSize: 16,
              }}
              style={styles.cardField}
              onCardChange={(card: CardFieldInput.Details) => {
                setCardComplete(Boolean(card.complete));
                setPreview({
                  last4: card.last4 ?? '',
                  expiryMonth: card.expiryMonth ?? 0,
                  expiryYear: card.expiryYear ?? 0,
                  brand: typeof card.brand === 'string' ? card.brand : '',
                });
              }}
            />
          )}
        </View>

        {/* Accepted brands */}
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
