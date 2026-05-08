import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import {
  EMPTY_BILLING_ADDRESS,
  getStoredBillingAddress,
  isBillingAddressComplete,
  saveBillingAddress,
  type RestaurantBillingAddress,
} from '@/lib/storage/restaurantBillingAddress';

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
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(201,168,76,0.16)',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  field: {
    paddingTop: spacing.sm,
  },
  fieldDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
    marginTop: spacing.sm,
  },
  fieldLabel: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldIcon: {
    width: 16,
    textAlign: 'center',
  },
  fieldInput: {
    ...typography.body,
    flex: 1,
    color: c.textPrimary,
    paddingVertical: 8,
  },
  fieldError: {
    ...typography.bodySmall,
    color: c.danger,
    marginTop: 4,
    fontSize: 12,
  },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: c.gold,
    borderRadius: borderRadius.full,
    paddingVertical: 14,
  },
  saveBtnText: {
    ...typography.body,
    color: c.bgBase,
    fontWeight: '700',
  },
}));

type FieldErrors = Partial<Record<keyof RestaurantBillingAddress, string>>;

export default function BillingAddressScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const [address, setAddress] = useState<RestaurantBillingAddress>(EMPTY_BILLING_ADDRESS);
  const [loaded, setLoaded] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    let cancelled = false;
    getStoredBillingAddress().then((stored) => {
      if (!cancelled) {
        setAddress(stored);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (key: keyof RestaurantBillingAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const onSave = () => {
    const next: FieldErrors = {};
    if (!address.line1.trim()) next.line1 = 'Street address is required.';
    if (!address.city.trim()) next.city = 'City is required.';
    if (!address.region.trim()) next.region = 'State or province is required.';
    if (!address.postalCode.trim()) next.postalCode = 'Postal code is required.';
    if (!address.country.trim()) next.country = 'Country is required.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    void (async () => {
      await saveBillingAddress({
        line1: address.line1.trim(),
        line2: address.line2.trim(),
        city: address.city.trim(),
        region: address.region.trim().toUpperCase(),
        postalCode: address.postalCode.trim().toUpperCase(),
        country: address.country.trim().toUpperCase(),
      });
      Alert.alert('Billing address saved', 'Your billing address is now on file.', [
        {
          text: 'OK',
          onPress: () =>
            router.replace({
              pathname: '/(staff)/payment-method',
              params: { source: source ?? 'settings' },
            } as never),
        },
      ]);
    })();
  };

  const complete = useMemo(() => isBillingAddressComplete(address), [address]);

  return (
    <OwnerScreen header={<SubpageHeader title="Billing address" accentBack />}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Billing address</Text>
          <Text style={styles.introText}>
            We use this address for receipts, tax documents, and to verify your payment card.
          </Text>
        </View>

        <View style={styles.noteRow}>
          <Ionicons name="lock-closed-outline" size={14} color={c.gold} />
          <Text style={styles.noteText}>
            Enter the address that matches the billing statement for your default card.
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>STREET ADDRESS</Text>
            <View style={styles.fieldRow}>
              <Ionicons name="home-outline" size={16} color={c.textMuted} style={styles.fieldIcon} />
              <TextInput
                value={address.line1}
                onChangeText={(v) => update('line1', v)}
                placeholder="123 King Street West"
                placeholderTextColor={c.textMuted}
                style={styles.fieldInput}
                autoCapitalize="words"
                editable={loaded}
              />
            </View>
            {errors.line1 ? <Text style={styles.fieldError}>{errors.line1}</Text> : null}
          </View>

          <View style={[styles.field, styles.fieldDivider]}>
            <Text style={styles.fieldLabel}>APARTMENT, SUITE (OPTIONAL)</Text>
            <View style={styles.fieldRow}>
              <Ionicons name="business-outline" size={16} color={c.textMuted} style={styles.fieldIcon} />
              <TextInput
                value={address.line2}
                onChangeText={(v) => update('line2', v)}
                placeholder="Suite 200"
                placeholderTextColor={c.textMuted}
                style={styles.fieldInput}
                autoCapitalize="words"
                editable={loaded}
              />
            </View>
          </View>

          <View style={[styles.field, styles.fieldDivider]}>
            <Text style={styles.fieldLabel}>CITY</Text>
            <View style={styles.fieldRow}>
              <Ionicons name="location-outline" size={16} color={c.textMuted} style={styles.fieldIcon} />
              <TextInput
                value={address.city}
                onChangeText={(v) => update('city', v)}
                placeholder="Toronto"
                placeholderTextColor={c.textMuted}
                style={styles.fieldInput}
                autoCapitalize="words"
                editable={loaded}
              />
            </View>
            {errors.city ? <Text style={styles.fieldError}>{errors.city}</Text> : null}
          </View>

          <View style={[styles.twoCol, styles.fieldDivider, { paddingTop: spacing.sm }]}>
            <View style={[styles.field, { flex: 1, paddingTop: 0 }]}>
              <Text style={styles.fieldLabel}>STATE / PROVINCE</Text>
              <View style={styles.fieldRow}>
                <Ionicons name="map-outline" size={16} color={c.textMuted} style={styles.fieldIcon} />
                <TextInput
                  value={address.region}
                  onChangeText={(v) => update('region', v)}
                  placeholder="ON"
                  placeholderTextColor={c.textMuted}
                  style={styles.fieldInput}
                  autoCapitalize="characters"
                  maxLength={3}
                  editable={loaded}
                />
              </View>
              {errors.region ? <Text style={styles.fieldError}>{errors.region}</Text> : null}
            </View>
            <View style={[styles.field, { flex: 1, paddingTop: 0 }]}>
              <Text style={styles.fieldLabel}>POSTAL CODE</Text>
              <View style={styles.fieldRow}>
                <Ionicons name="mail-outline" size={16} color={c.textMuted} style={styles.fieldIcon} />
                <TextInput
                  value={address.postalCode}
                  onChangeText={(v) => update('postalCode', v)}
                  placeholder="M5V 2T6"
                  placeholderTextColor={c.textMuted}
                  style={styles.fieldInput}
                  autoCapitalize="characters"
                  editable={loaded}
                />
              </View>
              {errors.postalCode ? <Text style={styles.fieldError}>{errors.postalCode}</Text> : null}
            </View>
          </View>

          <View style={[styles.field, styles.fieldDivider]}>
            <Text style={styles.fieldLabel}>COUNTRY</Text>
            <View style={styles.fieldRow}>
              <Ionicons name="flag-outline" size={16} color={c.textMuted} style={styles.fieldIcon} />
              <TextInput
                value={address.country}
                onChangeText={(v) => update('country', v)}
                placeholder="CA"
                placeholderTextColor={c.textMuted}
                style={styles.fieldInput}
                autoCapitalize="characters"
                maxLength={3}
                editable={loaded}
              />
            </View>
            {errors.country ? <Text style={styles.fieldError}>{errors.country}</Text> : null}
          </View>
        </View>

        <Pressable
          onPress={onSave}
          disabled={!loaded}
          style={({ pressed }) => [
            styles.saveBtn,
            pressed && { opacity: 0.85 },
            !loaded && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Save billing address"
        >
          <Ionicons name="checkmark-circle-outline" size={18} color={c.bgBase} />
          <Text style={styles.saveBtnText}>{complete ? 'Save billing address' : 'Save'}</Text>
        </Pressable>
      </ScrollView>
    </OwnerScreen>
  );
}
