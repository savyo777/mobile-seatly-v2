import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
    paddingVertical: 6,
    paddingRight: spacing.sm,
  },
  backText: { ...typography.body, color: c.textSecondary },
  brandWordmark: {
    color: c.gold,
    fontWeight: '700',
    letterSpacing: 4,
    fontSize: 12,
  },
  topRight: { width: 60 },

  /* Progress */
  progressWrap: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  progressFillActive: {
    flex: 1,
    backgroundColor: c.gold,
  },
  progressFillInactive: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1.2,
  },
  progressLabelActive: {
    color: c.gold,
  },

  /* Hero */
  hero: {
    marginBottom: spacing.xl,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.20)',
  },
  heroGradient: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroEyebrow: {
    ...typography.label,
    color: c.gold,
    letterSpacing: 1.6,
  },
  title: {
    ...typography.serifHeading,
    color: c.textPrimary,
    fontSize: 24,
    lineHeight: 30,
  },
  subtitle: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 20,
    maxWidth: 340,
  },

  /* Section */
  sectionLabel: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1.4,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionHelper: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
    lineHeight: 16,
  },
  formCard: {
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 2,
    marginBottom: spacing.xl,
  },

  /* Trust strip */
  trustStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(201,168,76,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    marginBottom: spacing.xl,
  },
  trustIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,168,76,0.14)',
  },
  trustText: {
    flex: 1,
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 16,
  },
  trustTitle: {
    color: c.textPrimary,
    fontWeight: '700',
  },

  /* Footer */
  footer: { marginTop: spacing.sm, gap: spacing.md },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  helperText: {
    ...typography.bodySmall,
    color: c.textMuted,
  },
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
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={20} color={c.textSecondary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.brandWordmark}>CENAIVA</Text>
          <View style={styles.topRight} />
        </View>

        {/* Progress indicator */}
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={styles.progressFillActive} />
            <View style={[styles.progressFillInactive, { marginLeft: 4 }]} />
          </View>
          <View style={styles.progressLabelRow}>
            <Text style={[styles.progressLabel, styles.progressLabelActive]}>
              STEP 1 · DETAILS
            </Text>
            <Text style={styles.progressLabel}>STEP 2 · PAYMENT</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <LinearGradient
            colors={['rgba(201,168,76,0.16)', 'rgba(201,168,76,0.02)']}
            locations={[0, 1]}
            style={styles.heroGradient}
          >
            <Text style={styles.heroEyebrow}>BUSINESS PROFILE</Text>
            <Text style={styles.title}>Tell us about your restaurant</Text>
            <Text style={styles.subtitle}>
              Just the essentials. We use these to verify the business and prepare your venue page.
            </Text>
          </LinearGradient>
        </View>

        {/* Identity section */}
        <Text style={styles.sectionLabel}>BUSINESS IDENTITY</Text>
        <Text style={styles.sectionHelper}>
          Verified details that keep the listing tied to the right venue.
        </Text>
        <View style={styles.formCard}>
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
        </View>

        {/* Contact section */}
        <Text style={styles.sectionLabel}>OWNER CONTACT</Text>
        <Text style={styles.sectionHelper}>
          Used by Cenaiva for owner support — never shown to diners.
        </Text>
        <View style={styles.formCard}>
          <Input
            icon="call-outline"
            label="Owner phone number"
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

        {/* Trust strip */}
        <View style={styles.trustStrip}>
          <View style={styles.trustIcon}>
            <Ionicons name="shield-checkmark-outline" size={16} color={c.gold} />
          </View>
          <Text style={styles.trustText}>
            <Text style={styles.trustTitle}>Verified onboarding.</Text>{' '}
            Information is encrypted and only used to confirm the business.
          </Text>
        </View>

        <View style={styles.footer}>
          <Button title="Continue to payment" onPress={onContinue} size="lg" />
          <View style={styles.helperRow}>
            <Ionicons name="time-outline" size={12} color={c.textMuted} />
            <Text style={styles.helperText}>About 1 minute remaining</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
