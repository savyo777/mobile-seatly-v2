import React, { useEffect, useMemo, useState } from 'react';
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
import { useStripe } from '@stripe/stripe-react-native';
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
const MONTHLY_FEE_LABEL = '$200.00 / mo';
const MONTHLY_FEE_SHORT = '$200';

type SetupIntentState =
  | { status: 'loading' }
  | {
      status: 'ready';
      clientSecret: string;
      setupIntentId: string;
      customerId: string;
      ephemeralKeySecret: string;
    }
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
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [saving, setSaving] = useState(false);
  const [intent, setIntent] = useState<SetupIntentState>({ status: 'loading' });
  const [sheetReady, setSheetReady] = useState(false);
  const [sheetInitError, setSheetInitError] = useState<string | null>(null);

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

  // 1) Backend creates the SetupIntent + Customer + Ephemeral Key on mount.
  //    All Stripe secret-key work happens inside the Supabase Edge Function;
  //    the app never sees the secret key.
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
          customerId: result.customerId,
          ephemeralKeySecret: result.customerEphemeralKeySecret,
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

  // 2) Once we have the client secret + ephemeral key, configure Stripe's
  //    native PaymentSheet. The sheet itself collects the card data — our
  //    code never touches raw card details. PaymentSheet uses our
  //    publishable key (set on StripeProvider in app/_layout.tsx).
  useEffect(() => {
    if (intent.status !== 'ready') return;
    let cancelled = false;
    void (async () => {
      const { error } = await initPaymentSheet({
        merchantDisplayName: 'Cenaiva',
        customerId: intent.customerId,
        customerEphemeralKeySecret: intent.ephemeralKeySecret,
        setupIntentClientSecret: intent.clientSecret,
        style: 'alwaysDark',
        appearance: {
          colors: {
            primary: c.gold,
            background: c.bgBase,
            componentBackground: c.bgSurface,
            componentBorder: 'rgba(255,255,255,0.10)',
            componentDivider: 'rgba(255,255,255,0.08)',
            primaryText: c.textPrimary,
            secondaryText: c.textSecondary,
            componentText: c.textPrimary,
            placeholderText: c.textMuted,
            icon: c.textSecondary,
          },
          shapes: { borderRadius: 8, borderWidth: 1 },
          primaryButton: {
            colors: { background: c.gold, text: '#1A1408' },
          },
        },
        defaultBillingDetails: {
          name: restaurantName.trim() || input.businessName.trim() || undefined,
          phone: input.ownerPhone.trim() || undefined,
          address: input.address.trim() ? { line1: input.address.trim() } : undefined,
        },
        allowsDelayedPaymentMethods: false,
        returnURL: 'cenaiva://stripe-redirect',
      });
      if (cancelled) return;
      if (error) {
        setSheetInitError(error.message);
        setSheetReady(false);
      } else {
        setSheetInitError(null);
        setSheetReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // restaurantName is intentionally NOT a dependency — re-initing the sheet
    // every keystroke would round-trip Stripe. We seed it from the upstream
    // business name on mount; PaymentSheet picks up the latest value when
    // the user opens it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent.status]);

  const onSubmit = () => {
    void (async () => {
      if (saving) return;
      Keyboard.dismiss();

      if (intent.status !== 'ready') {
        Alert.alert('Card form not ready', 'Please wait a moment, then try again.');
        return;
      }
      if (!sheetReady) {
        Alert.alert(
          'Card form not ready',
          sheetInitError ?? 'Setting up secure card entry — please try again in a moment.',
        );
        return;
      }

      // 3) Hand off to Stripe's native PaymentSheet. The user enters their
      //    card directly into Stripe's UI; on success Stripe confirms the
      //    SetupIntent and returns to our app.
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Payment setup failed', presentError.message);
        }
        return;
      }

      // 4) Finalize on the backend (creates the Stripe subscription, the
      //    restaurant row, etc.) using the same SetupIntent id.
      setSaving(true);
      try {
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
          'Could not finish registration',
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

  const canSubmit = intent.status === 'ready' && sheetReady && !saving;

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
                  autoComplete="off"
                  textContentType="none"
                  spellCheck={false}
                  importantForAutofill="no"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  blurOnSubmit
                />
              </View>

              <View style={[s.fieldRow, { borderBottomColor: dashed }]}>
                <Text style={[s.fieldLabel, { color: c.textMuted }]}>CARD DETAILS</Text>
                <View style={s.cardSummaryRow}>
                  <Ionicons name="card-outline" size={18} color={c.textSecondary} />
                  <Text style={[s.cardSummaryText, { color: c.textSecondary }]}>
                    {intent.status === 'loading' || !sheetReady
                      ? 'Preparing secure card entry…'
                      : 'Tap Save card to enter your card securely'}
                  </Text>
                  {(intent.status === 'loading' || !sheetReady) && intent.status !== 'error' ? (
                    <ActivityIndicator color={c.gold} size="small" />
                  ) : null}
                </View>
              </View>

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

          {sheetInitError ? (
            <View style={s.errorCard}>
              <Text style={[s.errorTitle, { color: c.textPrimary }]}>Card sheet unavailable</Text>
              <Text style={[s.errorText, { color: c.textSecondary }]}>{sheetInitError}</Text>
            </View>
          ) : null}

          <View style={s.ctaWrap}>
            <Pressable
              onPress={onSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                s.cta,
                { backgroundColor: ctaBg, borderColor: ctaBg },
                !canSubmit && s.ctaDisabled,
                pressed && canSubmit && { opacity: 0.85 },
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
    minHeight: 22,
  },
  cardSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    minHeight: 22,
  },
  cardSummaryText: {
    fontFamily: SF,
    fontSize: 13,
    flex: 1,
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
