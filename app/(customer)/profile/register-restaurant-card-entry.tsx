import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useConfirmSetupIntent } from '@stripe/stripe-react-native';
import { useColors } from '@/lib/theme';
import { getStripeEnv } from '@/lib/stripe/env';
import {
  finalizeRestaurantRegistration,
  getRestaurantPaymentMethodPreview,
  initRestaurantRegistrationPaymentSheet,
} from '@/lib/services/restaurantRegistration';
import { OWNER_TRIAL_MONTHS } from '@/lib/owner/trialPolicy';

const SF = Platform.OS === 'ios' ? 'System' : undefined;
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

// Display monthly fee shown after trial. Tracked in
// docs/UNHARDCODE_CHECKLIST.md (Phase K) — wire to a single owner-pricing
// source once Cenaiva pricing has one.
const MONTHLY_FEE_LABEL = '$200.00 / mo';
const MONTHLY_FEE_SHORT = '$200';

type SetupIntentState =
  | { status: 'loading' }
  | { status: 'ready'; clientSecret: string; setupIntentId: string }
  | { status: 'error'; message: string };

// ─────────────────────────────────────────────────────────────────────────────
// Card formatting / validation helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatCardNumber(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 19);
  const groups = digits.match(/.{1,4}/g);
  return groups ? groups.join(' ') : '';
}

function formatExpiry(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
}

function parseExpiry(formatted: string): { month: number; year: number } | null {
  const digits = formatted.replace(/\D/g, '');
  if (digits.length !== 4) return null;
  const month = Number(digits.slice(0, 2));
  const year = 2000 + Number(digits.slice(2, 4));
  if (!Number.isFinite(month) || month < 1 || month > 12) return null;
  if (!Number.isFinite(year)) return null;
  // Basic past-date guard: card must expire end-of-month >= today.
  const now = new Date();
  const lastDayOfExpiryMonth = new Date(year, month, 0);
  if (lastDayOfExpiryMonth < new Date(now.getFullYear(), now.getMonth(), 1)) return null;
  return { month, year };
}

function passesLuhn(rawNumber: string): boolean {
  const digits = rawNumber.replace(/\D/g, '');
  if (digits.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function detectBrand(rawNumber: string): string {
  const d = rawNumber.replace(/\D/g, '');
  if (/^4/.test(d)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'Amex';
  if (/^6(?:011|5)/.test(d)) return 'Discover';
  return '';
}

function expectedCvcLength(rawNumber: string): 3 | 4 {
  return /^3[47]/.test(rawNumber.replace(/\D/g, '')) ? 4 : 3;
}

// ─────────────────────────────────────────────────────────────────────────────
// Direct Stripe API call — creates a PaymentMethod from raw card data using
// the publishable key. This is the same flow Stripe.js uses on web: the card
// data goes from device → Stripe and never touches our server.
// ─────────────────────────────────────────────────────────────────────────────
async function createStripePaymentMethod(args: {
  publishableKey: string;
  cardNumber: string;
  expMonth: number;
  expYear: number;
  cvc: string;
  billingName?: string;
}): Promise<{ id: string }> {
  const body = new URLSearchParams();
  body.append('type', 'card');
  body.append('card[number]', args.cardNumber.replace(/\D/g, ''));
  body.append('card[exp_month]', String(args.expMonth));
  body.append('card[exp_year]', String(args.expYear));
  body.append('card[cvc]', args.cvc);
  if (args.billingName?.trim()) body.append('billing_details[name]', args.billingName.trim());

  const response = await fetch('https://api.stripe.com/v1/payment_methods', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.publishableKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Could not validate card. Please check your details.');
  }
  if (!data?.id) throw new Error('Stripe did not return a payment method id.');
  return { id: String(data.id) };
}

function formatTrialEnd(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + months);
  return out;
}

export default function RegisterRestaurantCardEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { confirmSetupIntent } = useConfirmSetupIntent();

  const [saving, setSaving] = useState(false);
  const [intent, setIntent] = useState<SetupIntentState>({ status: 'loading' });

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const cardNumberRef = useRef<TextInput>(null);
  const expiryRef = useRef<TextInput>(null);
  const cvcRef = useRef<TextInput>(null);

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

  const [restaurantName, setRestaurantName] = useState(input.businessName);
  useEffect(() => {
    setRestaurantName(input.businessName);
  }, [input.businessName]);

  const trialEndsLabel = useMemo(
    () => formatTrialEnd(addMonths(new Date(), OWNER_TRIAL_MONTHS)),
    [],
  );

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

  const brand = detectBrand(cardNumber);
  const expectedCvc = expectedCvcLength(cardNumber);
  const parsedExpiry = parseExpiry(expiry);
  const cardComplete =
    passesLuhn(cardNumber) &&
    !!parsedExpiry &&
    cvc.replace(/\D/g, '').length === expectedCvc;

  const onSubmit = () => {
    void (async () => {
      if (saving) return;
      Keyboard.dismiss();

      if (intent.status !== 'ready') {
        Alert.alert('Card form not ready', 'Please wait a moment, then try again.');
        return;
      }
      if (!passesLuhn(cardNumber)) {
        Alert.alert('Invalid card number', 'Please double-check the number on your card.');
        return;
      }
      if (!parsedExpiry) {
        Alert.alert('Invalid expiry', 'Enter a valid MM / YY in the future.');
        return;
      }
      if (cvc.replace(/\D/g, '').length !== expectedCvc) {
        Alert.alert('Invalid CVC', `CVC should be ${expectedCvc} digits.`);
        return;
      }

      const { publishableKey } = getStripeEnv();
      if (!publishableKey) {
        Alert.alert(
          'Stripe not configured',
          'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing. Please contact support.',
        );
        return;
      }

      setSaving(true);
      try {
        // 1) Create a PaymentMethod directly with Stripe (publishable-key
        //    request — card data never touches our backend).
        const pm = await createStripePaymentMethod({
          publishableKey,
          cardNumber,
          expMonth: parsedExpiry.month,
          expYear: parsedExpiry.year,
          cvc: cvc.replace(/\D/g, ''),
          billingName: restaurantName.trim() || input.businessName,
        });

        // 2) Confirm the SetupIntent server-issued at screen mount, using the
        //    PaymentMethod we just created.
        const { error: confirmError } = await confirmSetupIntent(intent.clientSecret, {
          paymentMethodType: 'Card',
          paymentMethodData: {
            paymentMethodId: pm.id,
            billingDetails: {
              name: restaurantName.trim() || input.businessName.trim() || undefined,
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

  const bg = c.bgBase;
  const surface = c.bgSurface;
  const dashed = 'rgba(255,255,255,0.10)';
  const ctaBg = c.gold;
  const ctaFg = '#1A1408';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: bg }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={bg} />
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={s.flex}
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar */}
          <View style={s.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={16} color={c.textPrimary} />
              <Text style={[s.backText, { color: c.textPrimary }]}>Back</Text>
            </Pressable>
            <Text style={[s.brandWordmark, { color: c.gold }]}>CENAIVA</Text>
            <View style={{ width: 50 }} />
          </View>

          {/* Header */}
          <View style={s.headerWrap}>
            <Text style={[s.eyebrow, { color: c.textSecondary }]}>Step 03 / Billing</Text>
            <Text style={[s.title, { color: c.textPrimary }]}>
              Your card,{'\n'}
              <Text style={[s.titleItalic, { color: c.gold }]}>quietly</Text> on file.
            </Text>
            <Text style={[s.subtitle, { color: c.textSecondary }]}>
              Three months on us. After that, {MONTHLY_FEE_SHORT} / month — cancel anytime.
            </Text>
          </View>

          {/* Receipt */}
          <View style={s.receiptOuter}>
            <View style={s.ticketNotches} pointerEvents="none">
              {Array.from({ length: 22 }).map((_, i) => (
                <View key={i} style={[s.notchDot, { backgroundColor: bg }]} />
              ))}
            </View>

            <View
              style={[
                s.receipt,
                { backgroundColor: surface, borderColor: 'rgba(255,255,255,0.06)' },
              ]}
            >
              <View style={s.receiptHeaderRow}>
                <Text style={[s.receiptEyebrow, { color: c.textMuted }]}>Cenaiva · Restaurant</Text>
                <Text style={[s.receiptNo, { color: c.textMuted }]}>NO. 0001</Text>
              </View>

              {intent.status === 'loading' ? (
                <View style={s.cardLoadingRow}>
                  <ActivityIndicator color={c.gold} />
                  <Text style={[s.cardLoadingText, { color: c.textSecondary }]}>
                    Preparing secure card form…
                  </Text>
                </View>
              ) : (
                <>
                  {/* Restaurant name */}
                  <View
                    style={[
                      s.fieldRow,
                      s.fieldRowFirst,
                      { borderTopColor: dashed, borderBottomColor: dashed },
                    ]}
                  >
                    <Text style={[s.fieldLabel, { color: c.textMuted }]}>RESTAURANT NAME</Text>
                    <TextInput
                      value={restaurantName}
                      onChangeText={setRestaurantName}
                      placeholder="Your restaurant's name"
                      placeholderTextColor={c.textMuted}
                      style={[s.fieldInput, { color: c.textPrimary }]}
                      autoCapitalize="words"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={() => cardNumberRef.current?.focus()}
                      blurOnSubmit={false}
                    />
                  </View>

                  {/* Card number */}
                  <View style={[s.fieldRow, { borderBottomColor: dashed }]}>
                    <View style={s.fieldLabelRow}>
                      <Text style={[s.fieldLabel, { color: c.textMuted }]}>CARD NUMBER</Text>
                      {brand ? (
                        <Text style={[s.brandTag, { color: c.gold }]}>{brand}</Text>
                      ) : null}
                    </View>
                    <TextInput
                      ref={cardNumberRef}
                      value={cardNumber}
                      onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                      placeholder="1234 5678 9012 3456"
                      placeholderTextColor={c.textMuted}
                      style={[s.fieldInputMono, { color: c.textPrimary }]}
                      keyboardType="number-pad"
                      inputMode="numeric"
                      maxLength={23}
                      returnKeyType="done"
                      onSubmitEditing={() => expiryRef.current?.focus()}
                      blurOnSubmit={false}
                    />
                  </View>

                  {/* Expiry */}
                  <View style={[s.fieldRow, { borderBottomColor: dashed }]}>
                    <Text style={[s.fieldLabel, { color: c.textMuted }]}>EXPIRY DATE</Text>
                    <TextInput
                      ref={expiryRef}
                      value={expiry}
                      onChangeText={(t) => setExpiry(formatExpiry(t))}
                      placeholder="MM / YY"
                      placeholderTextColor={c.textMuted}
                      style={[s.fieldInputMono, { color: c.textPrimary }]}
                      keyboardType="number-pad"
                      inputMode="numeric"
                      maxLength={7}
                      returnKeyType="done"
                      onSubmitEditing={() => cvcRef.current?.focus()}
                      blurOnSubmit={false}
                    />
                  </View>

                  {/* CVC */}
                  <View style={[s.fieldRow, { borderBottomColor: dashed }]}>
                    <Text style={[s.fieldLabel, { color: c.textMuted }]}>CVC</Text>
                    <TextInput
                      ref={cvcRef}
                      value={cvc}
                      onChangeText={(t) => setCvc(t.replace(/\D/g, '').slice(0, expectedCvc))}
                      placeholder={expectedCvc === 4 ? '••••' : '•••'}
                      placeholderTextColor={c.textMuted}
                      style={[s.fieldInputMono, { color: c.textPrimary }]}
                      keyboardType="number-pad"
                      inputMode="numeric"
                      maxLength={4}
                      secureTextEntry
                      returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                      blurOnSubmit
                    />
                  </View>
                </>
              )}

              {/* Totals */}
              <View style={[s.totals, { borderTopColor: dashed }]}>
                <ReceiptRow k="Today's charge" v="$0.00" textColors={c} />
                <ReceiptRow k="Trial ends" v={trialEndsLabel} textColors={c} />
                <ReceiptRow k="Then" v={MONTHLY_FEE_LABEL} bold textColors={c} />
              </View>
            </View>
          </View>

          {typeof params.paymentError === 'string' ? (
            <View style={s.errorCard}>
              <Text style={[s.errorTitle, { color: c.textPrimary }]}>Use the card form above</Text>
              <Text style={[s.errorText, { color: c.textSecondary }]}>{params.paymentError}</Text>
            </View>
          ) : null}

          {intent.status === 'error' ? (
            <View style={s.errorCard}>
              <Text style={[s.errorTitle, { color: c.textPrimary }]}>Could not prepare card form</Text>
              <Text style={[s.errorText, { color: c.textSecondary }]}>{intent.message}</Text>
            </View>
          ) : null}

          {/* CTA */}
          <View style={s.ctaWrap}>
            <Pressable
              onPress={onSubmit}
              disabled={saving || intent.status !== 'ready' || !cardComplete}
              style={({ pressed }) => [
                s.cta,
                { backgroundColor: ctaBg, borderColor: ctaBg },
                (saving || intent.status !== 'ready' || !cardComplete) && s.ctaDisabled,
                pressed && !saving && intent.status === 'ready' && cardComplete && { opacity: 0.85 },
              ]}
            >
              <Text style={[s.ctaLabel, { color: ctaFg }]}>{saving ? 'SAVING…' : 'SAVE CARD'}</Text>
            </Pressable>

            <View style={s.trustRow}>
              <Ionicons name="lock-closed-outline" size={11} color={c.textMuted} />
              <Text style={[s.trustText, { color: c.textMuted }]}>Stripe-encrypted · PCI DSS</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ReceiptRow({
  k,
  v,
  bold,
  textColors,
}: {
  k: string;
  v: string;
  bold?: boolean;
  textColors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={s.receiptTotalsRow}>
      <Text style={[s.totalsLabel, { color: textColors.textSecondary }]}>{k}</Text>
      <Text
        style={[
          s.totalsValue,
          { color: bold ? textColors.textPrimary : textColors.textSecondary },
          bold && s.totalsValueBold,
        ]}
      >
        {v}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1 },
  scrollContent: {
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontFamily: SF,
    fontSize: 14,
    fontWeight: '500',
  },
  brandWordmark: {
    fontFamily: SF,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 5,
    textTransform: 'uppercase',
  },
  headerWrap: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  eyebrow: {
    fontFamily: SF,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 3.2,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: SERIF,
    fontSize: 40,
    lineHeight: 42,
    fontWeight: '500',
    letterSpacing: -1,
    marginTop: 12,
  },
  titleItalic: {
    fontStyle: 'italic',
  },
  subtitle: {
    fontFamily: SF,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 14,
  },
  receiptOuter: {
    marginHorizontal: 22,
    marginTop: 22,
    position: 'relative',
  },
  ticketNotches: {
    position: 'absolute',
    top: -6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    zIndex: 2,
  },
  notchDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  receipt: {
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  receiptHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  receiptEyebrow: {
    fontFamily: SF,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  receiptNo: {
    fontFamily: MONO,
    fontSize: 10,
  },
  cardLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  cardLoadingText: {
    fontFamily: SF,
    fontSize: 12,
  },
  fieldRow: {
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  fieldRowFirst: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontFamily: SF,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  brandTag: {
    fontFamily: SF,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  fieldInput: {
    fontFamily: MONO,
    fontSize: 14,
    marginTop: 4,
    padding: 0,
    minHeight: 22,
  },
  fieldInputMono: {
    fontFamily: MONO,
    fontSize: 16,
    marginTop: 6,
    padding: 0,
    minHeight: 22,
    letterSpacing: 1,
  },
  totals: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  receiptTotalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalsLabel: {
    fontFamily: SF,
    fontSize: 13,
  },
  totalsValue: {
    fontFamily: MONO,
    fontSize: 13,
  },
  totalsValueBold: {
    fontWeight: '700',
  },
  errorCard: {
    marginHorizontal: 22,
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.30)',
    backgroundColor: 'rgba(239,68,68,0.08)',
    padding: 14,
    gap: 4,
  },
  errorTitle: {
    fontFamily: SF,
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    fontFamily: SF,
    fontSize: 12,
    lineHeight: 17,
  },
  ctaWrap: {
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  cta: {
    height: 52,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaLabel: {
    fontFamily: SF,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  trustText: {
    fontFamily: SF,
    fontSize: 11,
  },
});
