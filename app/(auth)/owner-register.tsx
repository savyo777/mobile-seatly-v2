import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors, createStyles, spacing, typography, borderRadius } from '@/lib/theme';
import { getSupabase } from '@/lib/supabase/client';
import { ensureOwnerProfile, signInWithGoogle } from '@/lib/services/oauth';
import { normalizePhoneToE164, sendPhoneOtp } from '@/lib/services/phoneAuth';
import { Input, Button, SocialAuthButtons, TermsFooter, Checkbox } from '@/components/ui';

const TERMS_URL = 'https://cenaiva.com/terms';
const PRIVACY_URL = 'https://cenaiva.com/privacy';

type PasswordChecks = {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
};

function getPasswordChecks(pw: string): PasswordChecks {
  return {
    minLength: pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    number: /\d/.test(pw),
    special: /[!@#$%^&*_\-?.]/.test(pw),
  };
}

const useStyles = createStyles((c) => ({
  root: {
    flex: 1,
    backgroundColor: c.bgBase,
  },
  scroll: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing['2xl'],
  },
  backText: {
    ...typography.body,
    color: c.textSecondary,
  },
  logo: {
    fontSize: 36,
    fontWeight: '700',
    color: c.gold,
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  badgeRow: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: c.gold,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.bgBase,
    letterSpacing: 0.5,
  },
  heading: {
    ...typography.h2,
    color: c.textPrimary,
    marginBottom: spacing.sm,
  },
  tagline: {
    ...typography.body,
    color: c.textSecondary,
    marginBottom: spacing['2xl'],
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionLabelText: {
    ...typography.label,
    color: c.gold,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginVertical: spacing['2xl'],
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
  },
  dividerText: {
    ...typography.bodySmall,
    color: c.textMuted,
    textTransform: 'lowercase',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing['2xl'],
  },
  termsText: {
    ...typography.bodySmall,
    color: c.textMuted,
    flex: 1,
    lineHeight: 19,
    fontWeight: '500',
  },
  termsLink: {
    color: c.gold,
    fontWeight: '600',
  },
  ctaBtn: {
    marginBottom: spacing.lg,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  footerMuted: {
    ...typography.body,
    color: c.textSecondary,
  },
  footerLink: {
    ...typography.body,
    color: c.gold,
    fontWeight: '600',
  },
  termsBottom: {},
  pwMeter: {
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing.sm,
  },
  pwSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.bgElevated,
  },
  pwSegOn: { backgroundColor: c.gold },
  pwHintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: spacing.md,
  },
  pwHint: { ...typography.bodySmall, color: c.textMuted },
  pwLabel: { ...typography.bodySmall, color: c.gold, fontWeight: '700' },
  pwRule: { ...typography.bodySmall, color: c.textMuted, marginTop: 4 },
  pwRuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 6,
  },
  pwRuleLine: {
    width: 18,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#6B1E1E',
  },
  pwRuleLinePass: {
    backgroundColor: '#2E8B57',
  },
  pwRuleText: {
    ...typography.bodySmall,
    color: c.textMuted,
    flex: 1,
    lineHeight: 18,
  },
  pwRuleTextPass: {
    color: '#2E8B57',
    fontWeight: '600',
  },
}));

export default function OwnerRegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const checks = useMemo(() => getPasswordChecks(password), [password]);
  const metCount = Object.values(checks).filter(Boolean).length;
  const score = (metCount >= 5 ? 3 : metCount >= 3 ? 2 : metCount >= 1 ? 1 : 0) as 0 | 1 | 2 | 3;
  const isPasswordValid = metCount === 5;
  const strengthLabel =
    score === 3 ? t('auth.pwStrengthStrong') : score === 2 ? t('auth.pwStrengthMedium') : t('auth.pwStrengthWeak');

  const onSuccess = async () => {
    if (submitting) return;
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim();
    if (!trimmedName || !trimmedEmail || !password) {
      Alert.alert('Missing info', 'Please fill out your name, email, and password.');
      return;
    }
    if (!isPasswordValid) {
      Alert.alert('Password requirements', 'Please meet all password requirements before continuing.');
      return;
    }
    if (!agree) {
      Alert.alert('Agreement required', 'Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      Alert.alert('Supabase not configured', 'Missing Supabase environment variables.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
            role: 'owner',
            phone: phone.trim(),
            restaurant_name: restaurantName.trim(),
            cuisine_type: cuisineType.trim(),
          },
        },
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('already registered')) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password,
          });
          if (signInError || !signInData.session) {
            Alert.alert(
              'Account exists',
              'This email is already registered. Sign in with your existing password to add restaurant access.',
            );
            return;
          }
          try {
            await ensureOwnerProfile(signInData.session, {
              fullNameOverride: trimmedName,
            });
          } catch {
            // best-effort
          }
          Alert.alert('Account updated', 'Restaurant access has been added to your existing account.');
          router.replace('/(staff)');
          return;
        }
        Alert.alert('Sign up failed', error.message);
        return;
      }

      if (data.session?.user?.id) {
        try {
          await ensureOwnerProfile(data.session, {
            fullNameOverride: trimmedName,
          });
        } catch (profileError: any) {
          Alert.alert('Profile setup warning', profileError?.message ?? 'Could not update profile role.');
        }
      }

      Alert.alert(
        'Account created',
        'If email confirmation is enabled, please verify your email before signing in.',
      );
      router.replace(data.session ? '/(staff)' : '/(auth)/owner-login');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    if (submitting) return;
    if (!agree) {
      Alert.alert(
        'Agreement required',
        'Please agree to the Terms of Service and Privacy Policy before continuing.',
      );
      return;
    }
    const e164 = normalizePhoneToE164(phone);
    if (!e164) {
      Alert.alert(
        'Invalid phone',
        'Please enter a valid phone number (include country code, or 10-digit US number).',
      );
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await sendPhoneOtp(e164);
      if (error) {
        Alert.alert('SMS failed', error);
        return;
      }
      router.push({
        pathname: '/(auth)/verify-phone-otp',
        params: {
          phone: encodeURIComponent(e164),
          source: 'owner-register',
          fullName: encodeURIComponent(fullName.trim()),
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    if (submitting) return;
    if (!agree) {
      Alert.alert(
        'Agreement required',
        'Please agree to the Terms of Service and Privacy Policy before continuing.',
      );
      return;
    }
    setSubmitting(true);
    try {
      const result = await signInWithGoogle();
      if (result.status === 'cancelled') return;
      if (result.status === 'error') {
        Alert.alert('Google sign in failed', result.message);
        return;
      }
      try {
        await ensureOwnerProfile(result.session, {
          fullNameOverride: fullName.trim() || undefined,
        });
      } catch {
        // ignore: profile creation is best-effort and can be retried later
      }
      router.replace('/(staff)');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + spacing['3xl'], 48) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => router.push('/(auth)/owner-login')}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={20} color={c.textSecondary} />
          <Text style={styles.backText}>{t('auth.backToWelcome')}</Text>
        </TouchableOpacity>

        <Text style={styles.logo}>{t('common.appName')}</Text>

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Ionicons name="storefront-outline" size={14} color={c.bgBase} />
            <Text style={styles.badgeText}>{t('auth.restaurantOwner')}</Text>
          </View>
        </View>

        <Text style={styles.heading}>{t('auth.registerRestaurant')}</Text>
        <Text style={styles.tagline}>{t('auth.restaurantOwnerTagline')}</Text>

        <View style={styles.sectionLabel}>
          <Ionicons name="person-circle-outline" size={16} color={c.gold} />
          <Text style={styles.sectionLabelText}>Your Account</Text>
        </View>

        <Input
          icon="person-outline"
          placeholder={t('auth.fullName')}
          autoCapitalize="words"
          autoCorrect={false}
          value={fullName}
          onChangeText={setFullName}
        />
        <Input
          icon="mail-outline"
          placeholder={t('auth.email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />
        <Input
          icon="call-outline"
          placeholder={t('auth.phone')}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <Input
          icon="lock-closed-outline"
          placeholder={t('auth.password')}
          isPassword
          value={password}
          onChangeText={setPassword}
        />

        <View style={styles.pwMeter}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.pwSeg, i < score && styles.pwSegOn]} />
          ))}
        </View>
        <View style={styles.pwHintRow}>
          <Text style={styles.pwHint}>{t('auth.pwHintShort')}</Text>
          {password.length > 0 ? <Text style={styles.pwLabel}>{strengthLabel}</Text> : null}
        </View>
        <View style={styles.pwRuleRow}>
          <View style={[styles.pwRuleLine, checks.minLength && styles.pwRuleLinePass]} />
          <Text style={[styles.pwRuleText, checks.minLength && styles.pwRuleTextPass]}>At least 8 characters</Text>
        </View>
        <View style={styles.pwRuleRow}>
          <View style={[styles.pwRuleLine, checks.uppercase && styles.pwRuleLinePass]} />
          <Text style={[styles.pwRuleText, checks.uppercase && styles.pwRuleTextPass]}>
            At least 1 uppercase letter
          </Text>
        </View>
        <View style={styles.pwRuleRow}>
          <View style={[styles.pwRuleLine, checks.lowercase && styles.pwRuleLinePass]} />
          <Text style={[styles.pwRuleText, checks.lowercase && styles.pwRuleTextPass]}>
            At least 1 lowercase letter
          </Text>
        </View>
        <View style={styles.pwRuleRow}>
          <View style={[styles.pwRuleLine, checks.number && styles.pwRuleLinePass]} />
          <Text style={[styles.pwRuleText, checks.number && styles.pwRuleTextPass]}>At least 1 number</Text>
        </View>
        <View style={styles.pwRuleRow}>
          <View style={[styles.pwRuleLine, checks.special && styles.pwRuleLinePass]} />
          <Text style={[styles.pwRuleText, checks.special && styles.pwRuleTextPass]}>
            At least 1 special character (! @ # $ % ^ & * _ - ? .)
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.sectionLabel}>
          <Ionicons name="storefront-outline" size={16} color={c.gold} />
          <Text style={styles.sectionLabelText}>Your Restaurant</Text>
        </View>

        <Input
          icon="business-outline"
          placeholder={t('auth.restaurantName')}
          autoCapitalize="words"
          autoCorrect={false}
          value={restaurantName}
          onChangeText={setRestaurantName}
        />
        <Input
          icon="restaurant-outline"
          placeholder={t('auth.cuisineType')}
          autoCapitalize="words"
          autoCorrect={false}
          value={cuisineType}
          onChangeText={setCuisineType}
        />

        <View style={styles.termsRow}>
          <Checkbox
            checked={agree}
            onChange={setAgree}
            label={
              <Text style={styles.termsText}>
                {t('auth.iAgreeTo')}{' '}
                <Text style={styles.termsLink} onPress={() => Linking.openURL(TERMS_URL)}>
                  Terms of Service
                </Text>{' '}
                &{' '}
                <Text style={styles.termsLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
                  Privacy Policy
                </Text>
              </Text>
            }
          />
        </View>

        <Button
          title={t('auth.createAccount')}
          onPress={onSuccess}
          size="lg"
          style={styles.ctaBtn}
          disabled={!agree || submitting || !isPasswordValid}
        />

        <View style={styles.divider} />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.orPhoneSignUp')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <Input
          icon="call-outline"
          placeholder={t('auth.phone')}
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
          value={phone}
          onChangeText={setPhone}
        />

        <Button
          title={t('auth.sendSmsCode')}
          onPress={handleSendPhoneOtp}
          size="lg"
          style={styles.ctaBtn}
          disabled={!agree || submitting}
        />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.orSignUpWith')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <SocialAuthButtons
          onApple={() => router.replace('/(staff)')}
          onGoogle={handleGoogle}
        />

        <View style={styles.footerRow}>
          <Text style={styles.footerMuted}>{t('auth.alreadyHaveAccount')} </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/owner-login')}
            activeOpacity={0.7}
          >
            <Text style={styles.footerLink}>{t('auth.ownerSignIn')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.termsBottom}>
          <TermsFooter />
        </View>
      </ScrollView>
    </View>
  );
}
