import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createStyles, spacing, typography, useColors } from '@/lib/theme';
import { getSupabase } from '@/lib/supabase/client';
import { ensureCustomerProfile, signInWithGoogle } from '@/lib/services/oauth';
import { normalizePhoneToE164, sendPhoneOtp } from '@/lib/services/phoneAuth';
import {
  ScreenWrapper,
  Input,
  Button,
  SocialAuthButtons,
  Checkbox,
} from '@/components/ui';

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
  inner: {
    flexGrow: 1,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backText: {
    ...typography.body,
    color: c.textSecondary,
  },
  brandText: {
    fontFamily: 'Georgia',
    fontSize: 18,
    fontWeight: '700',
    color: c.gold,
    letterSpacing: 5,
  },
  topRight: { width: 60 },
  heading: {
    ...typography.serifDisplay,
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subcopy: {
    ...typography.body,
    color: c.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  termsText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    flexShrink: 1,
    lineHeight: 19,
    fontWeight: '500',
  },
  termsLink: { color: c.gold, fontWeight: '700' },
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
  spacer: { flex: 1, minHeight: spacing.lg },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  footerMuted: { ...typography.body, color: c.textSecondary },
  footerLink: { ...typography.body, color: c.gold, fontWeight: '700' },
}));

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [phone, setPhone] = useState('');
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
            role: 'diner',
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
              'This email is already registered. Sign in with your existing password to add customer access.',
            );
            return;
          }
          try {
            await ensureCustomerProfile(signInData.session, {
              fullNameOverride: trimmedName,
            });
          } catch {
            // best-effort
          }
          Alert.alert('Account updated', 'Customer access has been added to your existing account.');
          router.replace('/(customer)');
          return;
        }
        Alert.alert('Sign up failed', error.message);
        return;
      }

      // If auto-confirm is enabled and a session exists, create/update the profile immediately.
      if (data.session?.user?.id) {
        try {
          await ensureCustomerProfile(data.session, {
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
      router.replace(data.session ? '/(customer)' : '/(auth)/login');
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
      const { error } = await sendPhoneOtp(e164, {
        metadata: {
          role: 'diner',
          full_name: fullName.trim(),
        },
      });
      if (error) {
        Alert.alert('SMS failed', error);
        return;
      }
      router.push({
        pathname: '/(auth)/verify-phone-otp',
        params: {
          phone: encodeURIComponent(e164),
          source: 'register',
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
        await ensureCustomerProfile(result.session);
      } catch {
        // ignore: profile creation is best-effort and can be retried later
      }
      router.replace('/(customer)');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenWrapper scrollable withKeyboardAvoiding padded>
      <View style={[styles.inner, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/welcome')}
            style={styles.backBtn}
            activeOpacity={0.7}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={20} color={c.textSecondary} />
            <Text style={styles.backText}>{t('auth.backToWelcome')}</Text>
          </TouchableOpacity>
          <Text style={styles.brandText}>{t('common.appName')}</Text>
          <View style={styles.topRight} />
        </View>

        <Text style={styles.heading}>{t('auth.registerHeading')}</Text>
        <Text style={styles.subcopy}>{t('auth.registerTakesAbout')}</Text>

        <Input
          icon="person-outline"
          placeholder={t('auth.fullName')}
          autoCapitalize="words"
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

        <View style={styles.termsRow}>
          <Checkbox
            checked={agree}
            onChange={setAgree}
            label={
              <Text style={styles.termsText}>
                {t('auth.iAgreeTo')}{' '}
                <Text style={styles.termsLink} onPress={() => Linking.openURL(TERMS_URL)}>
                  {t('auth.termsShort')}
                </Text>{' '}
                &{' '}
                <Text style={styles.termsLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
                  {t('auth.privacyShort')}
                </Text>
              </Text>
            }
          />
        </View>

        <Button
          title={t('auth.createAccount')}
          onPress={onSuccess}
          size="lg"
          disabled={!agree || submitting || !isPasswordValid}
        />

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
          disabled={!agree || submitting}
        />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.orSignUpWith')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <SocialAuthButtons onApple={onSuccess} onGoogle={handleGoogle} />

        <View style={styles.spacer} />

        <View style={styles.footerRow}>
          <Text style={styles.footerMuted}>{t('auth.alreadyHaveAccount')} </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} activeOpacity={0.7}>
            <Text style={styles.footerLink}>{t('auth.alreadyHaveSignIn')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
}
