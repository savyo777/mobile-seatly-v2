import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { useColors } from '@/lib/theme';
import { OWNER_TRIAL_MONTHS } from '@/lib/owner/trialPolicy';
import { registerRestaurantNoBilling } from '@/lib/services/restaurantRegistration';
import { clearPendingOwnerReferral, readPendingOwnerReferral } from '@/lib/owner/pendingReferral';
import { getSupabase } from '@/lib/supabase/client';
import { friendlyError } from '@/lib/errors/friendlyError';
import {
  normalizeTextInput,
  sanitizeCardNumberInput,
  sanitizeCvcInput,
  sanitizeExpiryInput,
  sanitizeTextInput,
} from '@/lib/validation/input';

const SF = Platform.OS === 'ios' ? 'System' : undefined;
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

// Display monthly fee shown after trial. Tracked in
// docs/UNHARDCODE_CHECKLIST.md (Phase K) — wire to a single owner-pricing
// source once Cenaiva pricing has one.
const MONTHLY_FEE_LABEL = '$200.00 / mo';
const MONTHLY_FEE_SHORT = '$200';

// ─────────────────────────────────────────────────────────────────────────────
// Card formatting / validation helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatCardNumber(input: string): string {
  return sanitizeCardNumberInput(input);
}

function formatExpiry(input: string): string {
  return sanitizeExpiryInput(input).replace('/', ' / ');
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

  const [saving, setSaving] = useState(false);

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

  const brand = detectBrand(cardNumber);
  const expectedCvc = expectedCvcLength(cardNumber);
  const parsedExpiry = parseExpiry(expiry);
  const cardComplete =
    passesLuhn(cardNumber) &&
    !!parsedExpiry &&
    cvc.replace(/\D/g, '').length === expectedCvc;

  const onSubmit = () => {
    if (saving) return;
    Keyboard.dismiss();

    if (!passesLuhn(cardNumber)) {
      Alert.alert('Invalid card number', friendlyError(undefined, 'Please double-check the number on your card.'));
      return;
    }
    if (!parsedExpiry) {
      Alert.alert('Invalid expiry', friendlyError(undefined, 'Enter a valid MM / YY in the future.'));
      return;
    }
    if (cvc.replace(/\D/g, '').length !== expectedCvc) {
      Alert.alert('Invalid CVC', friendlyError(undefined, `CVC should be ${expectedCvc} digits.`));
      return;
    }

    setSaving(true);
    void (async () => {
      try {
        const result = await registerRestaurantNoBilling({
          businessName: normalizeTextInput(restaurantName, { maxLength: 120 }) || input.businessName,
          address: input.address,
          ownerPhone: input.ownerPhone,
          ...(pendingReferralCode ? { referredByCode: pendingReferralCode } : {}),
        });

        // Pending referral consumed (or skipped server-side); clear so a
        // future signup on this device doesn't accidentally reuse it.
        if (pendingReferralCode) {
          await clearPendingOwnerReferral();
        }

        // Refresh the local JWT so the updated role in user_metadata is
        // picked up on the next cold boot without a DB round-trip delay.
        const supabase = getSupabase();
        if (supabase) await supabase.auth.refreshSession().catch(() => {});

        const digits = cardNumber.replace(/\D/g, '');
        const last4 = digits.slice(-4);
        const previewBrand = (brand || 'Card').toUpperCase();

        router.replace({
          pathname: '/(customer)/profile/register-restaurant-success',
          params: {
            trialEndsAt: result.trialEndsAt,
            businessName: input.businessName,
            address: input.address,
            ownerPhone: input.ownerPhone,
            cardBrand: previewBrand,
            cardLast4: last4,
          },
        });
      } catch (err) {
        Alert.alert('Registration failed', friendlyError(err, 'Something went wrong. Please try again.'));
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
            {pendingReferralCode ? (
              <View style={[s.referralChip, { borderColor: c.gold }]}>
                <Ionicons name="gift-outline" size={12} color={c.gold} />
                <Text style={[s.referralChipText, { color: c.gold }]}>
                  Referral applied: {pendingReferralCode}
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
                      autoComplete="off"
                      textContentType="none"
                      importantForAutofill="no"
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
                      autoComplete="off"
                      textContentType="none"
                      importantForAutofill="no"
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
                      onChangeText={(t) => setCvc(sanitizeCvcInput(t, expectedCvc))}
                      placeholder={expectedCvc === 4 ? '••••' : '•••'}
                      placeholderTextColor={c.textMuted}
                      style={[s.fieldInputMono, { color: c.textPrimary }]}
                      keyboardType="number-pad"
                      inputMode="numeric"
                      autoComplete="off"
                      textContentType="none"
                      importantForAutofill="no"
                      passwordRules=""
                      maxLength={4}
                      returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                      blurOnSubmit
                    />
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
              onPress={onSubmit}
              disabled={saving || !cardComplete}
              style={({ pressed }) => [
                s.cta,
                { backgroundColor: ctaBg, borderColor: ctaBg },
                (saving || !cardComplete) && s.ctaDisabled,
                pressed && !saving && cardComplete && { opacity: 0.85 },
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
