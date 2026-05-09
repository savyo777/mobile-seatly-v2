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
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  CardForm,
  useConfirmSetupIntent,
  type CardFormView,
} from '@stripe/stripe-react-native';
import { useColors } from '@/lib/theme';
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
const MONTHLY_FEE_LABEL = '$89.00 / mo';

type SetupIntentState =
  | { status: 'loading' }
  | { status: 'ready'; clientSecret: string; setupIntentId: string }
  | { status: 'error'; message: string };

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
  const [cardComplete, setCardComplete] = useState(false);
  const [intent, setIntent] = useState<SetupIntentState>({ status: 'loading' });
  const cardFormRef = useRef<CardFormView.Methods | null>(null);

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

  // Cardholder is a regular text field (not PCI-protected). Default to the
  // business name so users with their business name on the card are one tap
  // away from done.
  const [cardholder, setCardholder] = useState(input.businessName);
  useEffect(() => {
    setCardholder(input.businessName);
  }, [input.businessName]);

  // Trial-end date is informational; the source of truth comes back from
  // finalizeRestaurantRegistration. Show a local estimate on this screen.
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

  const dismissAllInputs = () => {
    Keyboard.dismiss();
    cardFormRef.current?.blur?.();
  };

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
      dismissAllInputs();
      try {
        const { error: confirmError } = await confirmSetupIntent(intent.clientSecret, {
          paymentMethodType: 'Card',
          paymentMethodData: {
            billingDetails: {
              name: cardholder.trim() || input.businessName.trim() || undefined,
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

  // Theme-driven colors. Receipt aesthetic stays the same — paper
  // surfaces become dark surfaces, ink text becomes white, dashed
  // dividers become low-alpha white lines, ticket notches become
  // bgBase-colored cutouts.
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
        <TouchableWithoutFeedback onPress={dismissAllInputs} accessible={false}>
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
                Three months on us. After that, $89 / month — cancel anytime.
              </Text>
            </View>

            {/* Receipt card */}
            <View style={s.receiptOuter}>
              {/* ticket notches at top — same color as the page bg so they
                  look like cutouts in the receipt */}
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

                {/* Cardholder */}
                <View
                  style={[
                    s.fieldRow,
                    s.fieldRowFirst,
                    { borderTopColor: dashed, borderBottomColor: dashed },
                  ]}
                >
                  <Text style={[s.fieldLabel, { color: c.textMuted }]}>CARDHOLDER</Text>
                  <TextInput
                    value={cardholder}
                    onChangeText={setCardholder}
                    placeholder="Full name on card"
                    placeholderTextColor={c.textMuted}
                    style={[s.fieldInput, { color: c.textPrimary }]}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                    blurOnSubmit
                  />
                </View>

                {/* Stripe CardForm — number / expiry / CVC / postal */}
                <View style={[s.cardFormSection, { borderBottomColor: dashed }]}>
                  <Text style={[s.fieldLabel, { color: c.textMuted }]}>CARD DETAILS</Text>
                  {intent.status === 'loading' ? (
                    <View style={s.cardFormLoading}>
                      <ActivityIndicator color={c.gold} />
                      <Text style={[s.cardFormLoadingText, { color: c.textSecondary }]}>
                        Preparing secure card form…
                      </Text>
                    </View>
                  ) : (
                    <CardForm
                      ref={cardFormRef}
                      placeholders={{
                        number: '1234 5678 9012 3456',
                        expiration: 'MM / YY',
                        cvc: 'CVC',
                        postalCode: 'Postal / ZIP',
                      }}
                      cardStyle={{
                        backgroundColor: c.bgElevated,
                        textColor: c.textPrimary,
                        placeholderColor: c.textMuted,
                        borderColor: 'rgba(255,255,255,0.08)',
                        borderWidth: 0,
                        borderRadius: 4,
                        fontSize: 14,
                      }}
                      style={s.cardForm}
                      onFormComplete={(card: CardFormView.Details) => {
                        setCardComplete(Boolean(card.complete));
                      }}
                    />
                  )}
                </View>

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
        </TouchableWithoutFeedback>
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
  // top bar
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
  // header
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
  // receipt outer (with ticket notches)
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
  // dashed-row fields
  fieldRow: {
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  fieldRowFirst: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fieldLabel: {
    fontFamily: SF,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  fieldInput: {
    fontFamily: MONO,
    fontSize: 14,
    marginTop: 4,
    padding: 0,
    minHeight: 20,
  },
  // CardForm section
  cardFormSection: {
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  cardForm: {
    width: '100%',
    height: Platform.OS === 'ios' ? 220 : 200,
    marginTop: 6,
  },
  cardFormLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  cardFormLoadingText: {
    fontFamily: SF,
    fontSize: 12,
  },
  // totals
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
  // error
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
  // CTA
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
