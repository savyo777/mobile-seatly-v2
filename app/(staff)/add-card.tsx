import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { resolveAuthDisplayProfile } from '@/lib/auth/displayProfile';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import {
  inferCardBrand,
  saveRestaurantPaymentCard,
  type CardFunding,
} from '@/lib/storage/restaurantPaymentMethod';

type CardBrandKey = 'Visa' | 'Mastercard' | 'Amex' | 'Discover' | 'Other';

const BRAND_OPTIONS: { key: CardBrandKey; label: string }[] = [
  { key: 'Visa', label: 'Visa' },
  { key: 'Mastercard', label: 'Mastercard' },
  { key: 'Amex', label: 'Amex' },
  { key: 'Discover', label: 'Discover' },
  { key: 'Other', label: 'Other' },
];

const FUNDING_OPTIONS: { key: CardFunding; label: string }[] = [
  { key: 'credit', label: 'Credit' },
  { key: 'debit', label: 'Debit' },
  { key: 'prepaid', label: 'Prepaid' },
];

const useStyles = createStyles((c) => ({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing['3xl'] },
  intro: {
    paddingHorizontal: 4,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  introTitle: { ...typography.h2, color: c.textPrimary },
  introText: { ...typography.body, color: c.textMuted, lineHeight: 22 },
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
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(201,168,76,0.16)',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  formHeader: {
    marginBottom: spacing.md,
    gap: 3,
  },
  formTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  formSub: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 18,
  },
  field: {
    paddingVertical: 10,
    gap: 4,
  },
  fieldDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  pickerChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgElevated,
  },
  pickerChipActive: {
    borderColor: c.gold,
    backgroundColor: 'rgba(201,168,76,0.18)',
  },
  pickerChipText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    fontWeight: '600',
  },
  pickerChipTextActive: {
    color: c.gold,
    fontWeight: '700',
  },
  fieldLabel: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fieldIcon: { width: 18 },
  fieldInput: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '600',
    paddingVertical: 0,
    flex: 1,
  },
  fieldError: {
    ...typography.bodySmall,
    color: '#EF4444',
    lineHeight: 16,
  },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  defaultCard: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  defaultIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  defaultText: { flex: 1, gap: 2 },
  defaultTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  defaultSub: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 16,
  },
  toggleSwitch: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchOn: { backgroundColor: c.gold },
  toggleSwitchOff: { backgroundColor: c.border },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
  toggleKnobOn: { alignSelf: 'flex-end' },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: c.gold,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  saveBtnDisabled: {
    backgroundColor: c.bgElevated,
  },
  saveBtnText: {
    ...typography.body,
    color: c.bgBase,
    fontWeight: '800',
  },
  saveBtnTextDisabled: {
    color: c.textMuted,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    backgroundColor: 'rgba(201,168,76,0.06)',
    marginBottom: spacing.lg,
  },
  noteText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
}));

function sanitizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function formatCardNumber(value: string): string {
  const d = sanitizeDigits(value).slice(0, 19);
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatExpiry(value: string): string {
  const d = sanitizeDigits(value).slice(0, 4);
  if (d.length < 3) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

export default function AddCardScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const { user } = useAuthSession();
  const profile = useMemo(
    () => resolveAuthDisplayProfile(user, { fullName: 'Restaurant owner' }),
    [user],
  );
  const [cardholder, setCardholder] = useState(profile.fullName);
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [postal, setPostal] = useState('');
  const [makeDefault, setMakeDefault] = useState(true);
  const [brand, setBrand] = useState<CardBrandKey>('Visa');
  const [brandManuallySet, setBrandManuallySet] = useState(false);
  const [funding, setFunding] = useState<CardFunding>('credit');
  const [errors, setErrors] = useState<{
    cardholder?: string;
    number?: string;
    expiry?: string;
    cvc?: string;
    postal?: string;
  }>({});

  useEffect(() => {
    setCardholder((current) => (current.trim() ? current : profile.fullName));
  }, [profile.fullName]);

  // Auto-detect the brand from the card number until the user picks one
  // explicitly — once they do, we honor their choice.
  useEffect(() => {
    if (brandManuallySet) return;
    const inferred = inferCardBrand(sanitizeDigits(number));
    if (inferred === 'Visa' || inferred === 'Mastercard' || inferred === 'Amex' || inferred === 'Discover') {
      setBrand(inferred);
    }
  }, [number, brandManuallySet]);

  const onSave = () => {
    const digits = sanitizeDigits(number);
    const cvcDigits = sanitizeDigits(cvc);
    const expMatch = expiry.trim().match(/^(\d{2})\s*\/\s*(\d{2}|\d{4})$/);

    const next: typeof errors = {};
    if (!cardholder.trim()) next.cardholder = 'Cardholder name is required.';
    if (digits.length < 13 || digits.length > 19) next.number = 'Enter a valid card number.';
    if (!expMatch) next.expiry = 'Use MM/YY for the expiration date.';
    if (cvcDigits.length < 3 || cvcDigits.length > 4) next.cvc = 'Enter a 3 or 4 digit CVC.';
    if (!postal.trim()) next.postal = 'Billing postal code is required.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    void (async () => {
      const finalBrand = brand === 'Other' ? inferCardBrand(digits) : brand;
      await saveRestaurantPaymentCard({
        brand: finalBrand,
        funding,
        last4: digits.slice(-4),
        expiry,
        cardholder: cardholder.trim(),
        isDefault: makeDefault,
        source: 'manual',
      });

      Alert.alert(
        'Card saved',
        `Card ending in ${digits.slice(-4)} has been added${
          makeDefault ? ' and set as your default.' : '.'
        }`,
        [{
          text: 'OK',
          onPress: () =>
            router.replace({
              pathname: '/(staff)/payment-method',
              params: { source: source ?? 'settings' },
            } as never),
        }],
      );
    })();
  };

  return (
    <OwnerScreen header={<SubpageHeader title="Add a card" accentBack />}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Enter your card info</Text>
          <Text style={styles.introText}>
            Add the card you want on file for Cenaiva billing.
          </Text>
        </View>

        <View style={styles.noteRow}>
          <Ionicons name="lock-closed-outline" size={14} color={c.gold} />
          <Text style={styles.noteText}>
            Use a Visa, Mastercard, debit Visa, or credit card. The card is saved for restaurant billing.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Accepted cards</Text>
          <Text style={styles.summaryValue}>Visa, Mastercard, Debit Visa, Credit Card</Text>
          <Text style={styles.summaryText}>
            Add the card you want on file for Cenaiva billing.
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Card details</Text>
            <Text style={styles.formSub}>Enter the information exactly as it appears on the card.</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>CARD BRAND</Text>
            <View style={styles.pickerRow}>
              {BRAND_OPTIONS.map((option) => {
                const active = brand === option.key;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => {
                      setBrand(option.key);
                      setBrandManuallySet(true);
                    }}
                    style={({ pressed }) => [
                      styles.pickerChip,
                      active && styles.pickerChipActive,
                      pressed && { opacity: 0.85 },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Card brand ${option.label}`}
                  >
                    <Text style={[styles.pickerChipText, active && styles.pickerChipTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={[styles.field, styles.fieldDivider]}>
            <Text style={styles.fieldLabel}>CARD TYPE</Text>
            <View style={styles.pickerRow}>
              {FUNDING_OPTIONS.map((option) => {
                const active = funding === option.key;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setFunding(option.key)}
                    style={({ pressed }) => [
                      styles.pickerChip,
                      active && styles.pickerChipActive,
                      pressed && { opacity: 0.85 },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Card type ${option.label}`}
                  >
                    <Text style={[styles.pickerChipText, active && styles.pickerChipTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={[styles.field, styles.fieldDivider]}>
            <Text style={styles.fieldLabel}>CARDHOLDER NAME</Text>
            <View style={styles.fieldRow}>
              <Ionicons name="person-outline" size={16} color={c.textMuted} style={styles.fieldIcon} />
              <TextInput
                value={cardholder}
                onChangeText={(v) => {
                  setCardholder(v);
                  if (errors.cardholder) setErrors((p) => ({ ...p, cardholder: undefined }));
                }}
                placeholder={profile.fullName}
                placeholderTextColor={c.textMuted}
                style={styles.fieldInput}
                autoCapitalize="words"
              />
            </View>
            {errors.cardholder ? <Text style={styles.fieldError}>{errors.cardholder}</Text> : null}
          </View>

          <View style={[styles.field, styles.fieldDivider]}>
            <Text style={styles.fieldLabel}>CARD NUMBER</Text>
            <View style={styles.fieldRow}>
              <Ionicons name="card-outline" size={16} color={c.textMuted} style={styles.fieldIcon} />
              <TextInput
                value={number}
                onChangeText={(v) => {
                  setNumber(formatCardNumber(v));
                  if (errors.number) setErrors((p) => ({ ...p, number: undefined }));
                }}
                placeholder="4242 4242 4242 4242"
                placeholderTextColor={c.textMuted}
                style={styles.fieldInput}
                keyboardType="number-pad"
              />
            </View>
            {errors.number ? <Text style={styles.fieldError}>{errors.number}</Text> : null}
          </View>

          <View style={[styles.twoCol, styles.fieldDivider, { paddingTop: 10 }]}>
            <View style={[styles.field, { flex: 1, paddingTop: 0 }]}>
              <Text style={styles.fieldLabel}>EXPIRY</Text>
              <View style={styles.fieldRow}>
                <Ionicons name="calendar-outline" size={16} color={c.textMuted} style={styles.fieldIcon} />
                <TextInput
                  value={expiry}
                  onChangeText={(v) => {
                    setExpiry(formatExpiry(v));
                    if (errors.expiry) setErrors((p) => ({ ...p, expiry: undefined }));
                  }}
                  placeholder="MM/YY"
                  placeholderTextColor={c.textMuted}
                  style={styles.fieldInput}
                  keyboardType="number-pad"
                />
              </View>
              {errors.expiry ? <Text style={styles.fieldError}>{errors.expiry}</Text> : null}
            </View>
            <View style={[styles.field, { flex: 1, paddingTop: 0 }]}>
              <Text style={styles.fieldLabel}>CVC</Text>
              <View style={styles.fieldRow}>
                <Ionicons name="lock-closed-outline" size={16} color={c.textMuted} style={styles.fieldIcon} />
                <TextInput
                  value={cvc}
                  onChangeText={(v) => {
                    setCvc(sanitizeDigits(v).slice(0, 4));
                    if (errors.cvc) setErrors((p) => ({ ...p, cvc: undefined }));
                  }}
                  placeholder="123"
                  placeholderTextColor={c.textMuted}
                  style={styles.fieldInput}
                  keyboardType="number-pad"
                  secureTextEntry
                />
              </View>
              {errors.cvc ? <Text style={styles.fieldError}>{errors.cvc}</Text> : null}
            </View>
          </View>

          <View style={[styles.field, styles.fieldDivider]}>
            <Text style={styles.fieldLabel}>BILLING POSTAL CODE</Text>
            <View style={styles.fieldRow}>
              <Ionicons name="location-outline" size={16} color={c.textMuted} style={styles.fieldIcon} />
              <TextInput
                value={postal}
                onChangeText={(v) => {
                  setPostal(v.toUpperCase());
                  if (errors.postal) setErrors((p) => ({ ...p, postal: undefined }));
                }}
                placeholder="M5V 2T6"
                placeholderTextColor={c.textMuted}
                style={styles.fieldInput}
                autoCapitalize="characters"
              />
            </View>
            {errors.postal ? <Text style={styles.fieldError}>{errors.postal}</Text> : null}
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.defaultCard,
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => setMakeDefault((v) => !v)}
        >
          <View style={styles.defaultIcon}>
            <Ionicons name={makeDefault ? 'checkmark' : 'ellipse-outline'} size={14} color={c.gold} />
          </View>
          <View style={styles.defaultText}>
            <Text style={styles.defaultTitle}>Make this my default card</Text>
            <Text style={styles.defaultSub}>Use it for the subscription and usage fees.</Text>
          </View>
          <View style={[styles.toggleSwitch, makeDefault ? styles.toggleSwitchOn : styles.toggleSwitchOff]}>
            <View style={[styles.toggleKnob, makeDefault && styles.toggleKnobOn]} />
          </View>
        </Pressable>

        <Pressable
          onPress={onSave}
          style={({ pressed }) => [
            styles.saveBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.saveBtnText}>Save card</Text>
        </Pressable>

        <View style={styles.noteRow}>
          <Ionicons name="lock-closed-outline" size={14} color={c.gold} />
          <Text style={styles.noteText}>
            This card will be used for restaurant billing and saved as the default when selected.
          </Text>
        </View>
      </ScrollView>
    </OwnerScreen>
  );
}
