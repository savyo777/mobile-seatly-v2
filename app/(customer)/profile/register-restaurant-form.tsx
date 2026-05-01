import React, { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button, ScreenWrapper } from '@/components/ui';
import { createStyles, spacing, typography, useColors } from '@/lib/theme';
import { isValidCanadianHst, normalizePhoneWithCountryCode } from '@/lib/services/restaurantRegistration';

const useStyles = createStyles((c) => ({
  inner: { flex: 1, paddingTop: spacing.lg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  backText: { ...typography.body, color: c.textSecondary },
  topRight: { width: 60 },
  title: { ...typography.serifDisplay, color: c.textPrimary, textAlign: 'center', marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: c.textMuted, textAlign: 'center', marginBottom: spacing.lg },
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
    console.log('[restaurant-registration] field values', trimmed);
    console.log('[restaurant-registration] validation results', {
      hstValid: validation.hstValid,
      businessNameValid: validation.businessNameValid,
      addressValid: validation.addressValid,
      ownerPhoneValid: validation.ownerPhoneValid,
      ownerPhoneNormalized: validation.ownerPhoneNormalized,
      allValid: validation.allValid,
    });

    const nextErrors: {
      hstNumber?: string;
      businessName?: string;
      address?: string;
      ownerPhone?: string;
    } = {};
    if (!validation.hstValid) {
      nextErrors.hstNumber = 'Enter a valid HST (e.g. 123456789RT0001).';
    }
    if (!validation.businessNameValid) {
      nextErrors.businessName = 'Business name is required.';
    }
    if (!validation.addressValid) {
      nextErrors.address = 'Business address is required.';
    }
    if (!validation.ownerPhoneValid) {
      nextErrors.ownerPhone = 'Enter a valid phone number (at least 10 digits).';
    }
    setErrors(nextErrors);

    if (!validation.allValid) return;

    router.push({
      pathname: '/(customer)/profile/register-restaurant-payment',
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
      <View style={[styles.inner, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7} hitSlop={12}>
            <Ionicons name="chevron-back" size={20} color={c.textSecondary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={{ color: c.gold, fontWeight: '700', letterSpacing: 4 }}>CENAIVA</Text>
          <View style={styles.topRight} />
        </View>

        <Text style={styles.title}>Restaurant details</Text>
        <Text style={styles.subtitle}>Tell us about your business before payment setup.</Text>

        <Input
          icon="receipt-outline"
          label="HST Number"
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
          icon="business-outline"
          label="Business Name"
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
          icon="location-outline"
          label="Business Address"
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
          label="Owner Phone Number"
          placeholder="+14165551234"
          value={ownerPhone}
          onChangeText={(value) => {
            setOwnerPhone(value);
            if (errors.ownerPhone) setErrors((prev) => ({ ...prev, ownerPhone: undefined }));
          }}
          keyboardType="phone-pad"
          error={errors.ownerPhone}
        />

        <Button title="Continue to payment" onPress={onContinue} size="lg" />
      </View>
    </ScreenWrapper>
  );
}
