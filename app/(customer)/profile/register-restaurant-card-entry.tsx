import React, { useEffect, useMemo, useState } from 'react';
import {
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
import { OWNER_TRIAL_MONTHS } from '@/lib/owner/trialPolicy';
import { registerRestaurantNoBilling } from '@/lib/services/restaurantRegistration';
import { clearPendingOwnerReferral, readPendingOwnerReferral } from '@/lib/owner/pendingReferral';
import { getSupabase } from '@/lib/supabase/client';
import { friendlyError, isUserCancellation } from '@/lib/errors/friendlyError';
import { normalizeTextInput, sanitizeTextInput } from '@/lib/validation/input';
import {
  createRestaurantSetupIntent,
  saveRestaurantPaymentMethod,
} from '@/lib/owner/saveSubscriptionPaymentMethod';
import {
  ownerMonthlyPriceLabel,
  ownerMonthlyPriceShort,
} from '@/lib/owner/ownerPricing';

const SF = Platform.OS === 'ios' ? 'System' : undefined;
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const MONTHLY_FEE_LABEL = ownerMonthlyPriceLabel();
const MONTHLY_FEE_SHORT = ownerMonthlyPriceShort();

function formatTrialEnd(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + months);
  return out;
}

function formatBrand(brand: string | null): string {
  if (!brand) return 'Card';
  const v = brand.toLowerCase();
  if (v === 'visa') return 'Visa';
  if (v === 'mastercard') return 'Mastercard';
  if (v === 'amex' || v === 'american_express') return 'Amex';
  if (v === 'discover') return 'Discover';
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

interface SavedCardPreview {
  brand: string;
  last4: string;
  expMonth: number | null;
  expYear: number | null;
}

export default function RegisterRestaurantCardEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { initPaymentSheet, presentPaymentSheet, retrieveSetupIntent } = useStripe();

  const [saving, setSaving] = useState(false);
  const [savedCard, setSavedCard] = useState<SavedCardPreview | null>(null);
  const [registration, setRegistration] = useState<{ restaurantId: string; trialEndsAt: string } | null>(null);

  const params = useLocalSearchParams<{
    businessName?: string;
    address?: string;
    ownerPhone?: string;
  }>();

  const input = useMemo(
    () => ({
      businessName: typeof params.businessName === 'string'
        ? normalizeTextInput(params.businessName, { maxLength: 120 })
        : '',
      address: typeof params.address === 'string' ? normalizeTextInput(params.address, { maxLength: 180 }) : '',
      ownerPhone: typeof params.ownerPhone === 'string' ? normalizeTextInput(params.ownerPhone, { maxLength: 32 }) : '',
    }),
    [params.address, params.businessName, params.ownerPhone],
  );

  const [restaurantName, setRestaurantName] = useState(input.businessName);
  useEffect(() => {
    setRestaurantName(input.businessName);
  }, [input.businessName]);

  const [pendingReferralCode, setPendingReferralCode] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const pending = await readPendingOwnerReferral();
      if (!cancelled) setPendingReferralCode(pending?.code ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const trialEndsLabel = useMemo(
    () => formatTrialEnd(addMonths(new Date(), OWNER_TRIAL_MONTHS)),
    [],
  );

  // The exact disclosure the owner is agreeing to when they tap "Save card".
  // Written verbatim into subscription_consent_log per CRA-style auditability
  // — every byte the owner saw above the button should appear here.
  const disclosureText = useMemo(
    () =>
      [
        `By saving this card, ${restaurantName.trim() || 'your restaurant'} agrees to start a Cenaiva subscription.`,
        `${OWNER_TRIAL_MONTHS}-month free trial ends ${trialEndsLabel}.`,
        `After the trial, ${MONTHLY_FEE_LABEL} (CAD) will be charged automatically to this card.`,
        'Cancel any time from Account → Subscription. Per-booking fees may apply during paid months.',
        pendingReferralCode ? `Referral code applied: ${pendingReferralCode}.` : '',
      ]
        .filter((line) => line.length > 0)
        .join(' '),
    [restaurantName, trialEndsLabel, pendingReferralCode],
  );

  const handleSaveCard = () => {
    if (saving) return;
    Keyboard.dismiss();
    setSaving(true);
    void (async () => {
      try {
        // 1) Make sure the restaurant exists so the server has a row to attach
        //    the Stripe customer + PM to. This is idempotent on the server
        //    when the owner has already registered — it returns the existing
        //    restaurantId + trialEndsAt without re-creating.
        let reg = registration;
        if (!reg) {
          reg = await registerRestaurantNoBilling({
            businessName: normalizeTextInput(restaurantName, { maxLength: 120 }) || input.businessName,
            address: input.address,
            ownerPhone: input.ownerPhone,
            ...(pendingReferralCode ? { referredByCode: pendingReferralCode } : {}),
          });
          setRegistration(reg);

          // Refresh JWT so the new owner role lands in user_metadata before
          // we call the owner-only Stripe edge fns below.
          const supabase = getSupabase();
          if (supabase) await supabase.auth.refreshSession().catch(() => {});
        }

        // 2) Mint a SetupIntent on the restaurant's Stripe customer. The edge
        //    fn lazily creates the customer on first call.
        const { clientSecret } = await createRestaurantSetupIntent(reg.restaurantId);

        // 3) Present Stripe's PaymentSheet — Stripe collects the card; we
        //    never see PAN / CVC. Cancel returns to the form to retry.
        const initResult = await initPaymentSheet({
          setupIntentClientSecret: clientSecret,
          merchantDisplayName: 'Cenaiva',
          returnURL: 'cenaiva://stripe-redirect',
          allowsDelayedPaymentMethods: false,
        });
        if (initResult.error) {
          throw new Error(friendlyError(initResult.error, 'Could not open the secure card form.'));
        }
        const presentResult = await presentPaymentSheet();
        if (presentResult.error) {
          if (isUserCancellation(presentResult.error)) return;
          throw new Error(friendlyError(presentResult.error, 'Could not save the card.'));
        }

        // 4) Read the SetupIntent to discover the resulting PaymentMethod id,
        //    then hand it to the server to attach + set as default + log
        //    the consent disclosure.
        const retrieved = await retrieveSetupIntent(clientSecret);
        const pm = retrieved.setupIntent;
        const pmId =
          (pm?.paymentMethodId as string | undefined) ??
          (pm as unknown as { payment_method?: string })?.payment_method ??
          null;
        if (!pmId) {
          throw new Error('Stripe didn’t return a saved card. Please try again.');
        }
        await saveRestaurantPaymentMethod({
          restaurantId: reg.restaurantId,
          paymentMethodId: pmId,
          disclosureText,
        });

        // Surface card brand/last4 from PaymentSheet's response when present
        // so the screen can show a confirmation row before navigating.
        const card =
          (pm as unknown as {
            paymentMethod?: { Card?: { brand?: string; last4?: string; expMonth?: number; expYear?: number } };
          })?.paymentMethod?.Card ?? null;
        if (card?.last4) {
          setSavedCard({
            brand: card.brand ?? 'card',
            last4: card.last4,
            expMonth: typeof card.expMonth === 'number' ? card.expMonth : null,
            expYear: typeof card.expYear === 'number' ? card.expYear : null,
          });
        }

        if (pendingReferralCode) await clearPendingOwnerReferral();

        router.replace({
          pathname: '/(customer)/profile/register-restaurant-success',
          params: {
            trialEndsAt: reg.trialEndsAt,
            businessName: input.businessName,
            address: input.address,
            ownerPhone: input.ownerPhone,
            cardBrand: formatBrand(card?.brand ?? null).toUpperCase(),
            cardLast4: card?.last4 ?? '••••',
          },
        });
      } catch (err) {
        Alert.alert('Card not saved', friendlyError(err, 'Something went wrong. Please try again.'));
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

  const cardLineLabel = savedCard
    ? `${formatBrand(savedCard.brand)} •••• ${savedCard.last4}`
    : 'Stripe collects your card details';
  const expiryLineLabel =
    savedCard?.expMonth && savedCard.expYear
      ? `${String(savedCard.expMonth).padStart(2, '0')} / ${String(savedCard.expYear).slice(-2)}`
      : '— / —';

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
            {pendingReferralCode ? (
              <View style={[s.referralChip, { borderColor: c.gold }]}>
                <Ionicons name="gift-outline" size={12} color={c.gold} />
                <Text style={[s.referralChipText, { color: c.gold }]}>
                  Referral applied — 1 month free unlocked
                </Text>
                <Pressable
                  onPress={() => {
                    setPendingReferralCode(null);
                    void clearPendingOwnerReferral();
                  }}
                  hitSlop={8}
                  accessibilityLabel="Remove referral code"
                >
                  <Ionicons name="close" size={14} color={c.gold} />
                </Pressable>
              </View>
            ) : null}
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
                  onChangeText={(value) => setRestaurantName(sanitizeTextInput(value, { maxLength: 120 }))}
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
                  blurOnSubmit
                />
              </View>

              {/* Card on file (read-only — Stripe collects via PaymentSheet) */}
              <View style={[s.fieldRow, { borderBottomColor: dashed }]}>
                <View style={s.fieldLabelRow}>
                  <Text style={[s.fieldLabel, { color: c.textMuted }]}>CARD ON FILE</Text>
                  {savedCard ? (
                    <Text style={[s.brandTag, { color: c.gold }]}>SAVED</Text>
                  ) : null}
                </View>
                <Text
                  style={[
                    s.fieldInputMono,
                    { color: savedCard ? c.textPrimary : c.textMuted },
                  ]}
                >
                  {cardLineLabel}
                </Text>
              </View>

              {/* Expiry placeholder */}
              <View style={[s.fieldRow, { borderBottomColor: dashed }]}>
                <Text style={[s.fieldLabel, { color: c.textMuted }]}>EXPIRES</Text>
                <Text
                  style={[
                    s.fieldInputMono,
                    { color: savedCard ? c.textPrimary : c.textMuted },
                  ]}
                >
                  {expiryLineLabel}
                </Text>
              </View>

              {/* Totals */}
              <View style={[s.totals, { borderTopColor: dashed }]}>
                <ReceiptRow k="Today's charge" v="$0.00" textColors={c} />
                <ReceiptRow k="Trial ends" v={trialEndsLabel} textColors={c} />
                <ReceiptRow k="Then" v={MONTHLY_FEE_LABEL} bold textColors={c} />
              </View>
            </View>
          </View>

          {/* CTA */}
          <View style={s.ctaWrap}>
            <Pressable
              onPress={handleSaveCard}
              disabled={saving}
              style={({ pressed }) => [
                s.cta,
                { backgroundColor: ctaBg, borderColor: ctaBg },
                saving && s.ctaDisabled,
                pressed && !saving && { opacity: 0.85 },
              ]}
            >
              <Text style={[s.ctaLabel, { color: ctaFg }]}>
                {saving ? 'OPENING STRIPE…' : savedCard ? 'CARD SAVED' : 'ADD CARD VIA STRIPE'}
              </Text>
            </Pressable>

            <View style={s.trustRow}>
              <Ionicons name="lock-closed-outline" size={11} color={c.textMuted} />
              <Text style={[s.trustText, { color: c.textMuted }]}>
                Card collected by Stripe · Cenaiva never sees your PAN or CVC
              </Text>
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
  referralChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    marginTop: 14,
  },
  referralChipText: {
    fontFamily: SF,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
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
    paddingHorizontal: 12,
  },
  trustText: {
    fontFamily: SF,
    fontSize: 11,
    textAlign: 'center',
  },
});
