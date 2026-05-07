import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button, ScreenWrapper } from '@/components/ui';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import { isValidCanadianHst, normalizePhoneWithCountryCode } from '@/lib/services/restaurantRegistration';

const useStyles = createStyles((c) => ({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing['3xl'] },
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
  backText: { ...typography.body, color: c.textSecondary },
  topRight: { width: 60 },

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
  title: { ...typography.h2, color: c.textPrimary },
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

  footer: { marginTop: spacing.sm },
  secureRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secureText: { ...typography.bodySmall, color: c.textMuted },
}));

export default function RegisterRestaurantFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const [hstNumber, setHstNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [errors, setErrors] = useState<{
    hstNumber?: string;
    businessName?: string;
    address?: string;
    ownerPhone?: string;
  }>({});

  const trimmed = useMemo(
    () => ({
      hstNumber: hstNumber.trim(),
      businessName: businessName.trim(),
      address: address.trim(),
      ownerPhone: ownerPhone.trim(),
    }),
    [hstNumber, businessName, address, ownerPhone],
  );

  const validation = useMemo(() => {
    const hstValid = isValidCanadianHst(trimmed.hstNumber);
    const businessNameValid = trimmed.businessName.length > 0;
    const addressValid = trimmed.address.length > 0;
    const ownerPhoneNormalized = normalizePhoneWithCountryCode(trimmed.ownerPhone);
    const ownerPhoneValid = ownerPhoneNormalized.length > 0;
    return {
      hstValid,
      businessNameValid,
      addressValid,
      ownerPhoneValid,
      ownerPhoneNormalized,
      allValid: hstValid && businessNameValid && addressValid && ownerPhoneValid,
    };
  }, [trimmed]);

  const onContinue = () => {
    const nextErrors: typeof errors = {};
    if (!validation.hstValid) nextErrors.hstNumber = 'Enter a valid HST (e.g. 123456789RT0001).';
    if (!validation.businessNameValid) nextErrors.businessName = 'Business name is required.';
    if (!validation.addressValid) nextErrors.address = 'Business address is required.';
    if (!validation.ownerPhoneValid) nextErrors.ownerPhone = 'Enter a valid phone number.';
    setErrors(nextErrors);

    if (!validation.allValid) return;

    router.push({
      pathname: '/(customer)/profile/register-restaurant-card-entry',
      params: {
        hstNumber: trimmed.hstNumber,
        businessName: trimmed.businessName,
        address: trimmed.address,
        ownerPhone: trimmed.ownerPhone,
      },
    });
  };

  return (
    <ScreenWrapper withKeyboardAvoiding padded>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, spacing.lg) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
          <Text style={styles.eyebrow}>Step 1 of 2</Text>
          <Text style={styles.title}>Restaurant details</Text>
          <Text style={styles.subtitle}>A few quick details to get you set up.</Text>
        </View>

        <View style={styles.noteRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color={c.gold} />
          <Text style={styles.noteText}>
            We use this to verify your business and tie the listing to the right venue.
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.formCardHeader}>
            <Text style={styles.formCardTitle}>Business info</Text>
            <Text style={styles.formCardSub}>
              Enter your details exactly as registered.
            </Text>
          </View>

          <Input
            icon="business-outline"
            label="Business name"
            placeholder="Example Hospitality Inc."
            value={businessName}
            onChangeText={(value) => {
              setBusinessName(value);
              if (errors.businessName) setErrors((prev) => ({ ...prev, businessName: undefined }));
            }}
            autoCapitalize="words"
            error={errors.businessName}
          />
          <Input
            icon="receipt-outline"
            label="HST number"
            placeholder="123456789RT0001"
            value={hstNumber}
            onChangeText={(value) => {
              setHstNumber(value);
              if (errors.hstNumber) setErrors((prev) => ({ ...prev, hstNumber: undefined }));
            }}
            autoCapitalize="characters"
            error={errors.hstNumber}
          />
          <Input
            icon="location-outline"
            label="Business address"
            placeholder="123 King St W, Toronto, ON"
            value={address}
            onChangeText={(value) => {
              setAddress(value);
              if (errors.address) setErrors((prev) => ({ ...prev, address: undefined }));
            }}
            autoCapitalize="words"
            error={errors.address}
          />
          <Input
            icon="call-outline"
            label="Owner phone"
            placeholder="+1 416 555 1234"
            value={ownerPhone}
            onChangeText={(value) => {
              setOwnerPhone(value);
              if (errors.ownerPhone) setErrors((prev) => ({ ...prev, ownerPhone: undefined }));
            }}
            keyboardType="phone-pad"
            error={errors.ownerPhone}
          />
        </View>

        <View style={styles.footer}>
          <Button title="Continue" onPress={onContinue} size="lg" />
        </View>

        <View style={styles.secureRow}>
          <Ionicons name="shield-checkmark-outline" size={12} color={c.textMuted} />
          <Text style={styles.secureText}>Your details are kept private.</Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
