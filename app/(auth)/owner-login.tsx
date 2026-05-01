import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import { getSupabase } from '@/lib/supabase/client';
import { sendPasswordResetEmail } from '@/lib/services/accountSecurity';
import { signInWithGoogle } from '@/lib/services/oauth';
import { normalizePhoneToE164, sendPhoneOtp } from '@/lib/services/phoneAuth';
import {
  ScreenWrapper,
  Input,
  Button,
  SocialAuthButtons,
  TermsFooter,
  Checkbox,
} from '@/components/ui';

const useStyles = createStyles((c) => ({
  inner: {
    flex: 1,
    paddingTop: spacing.lg,
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
  pillWrap: {
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  ownerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.gold,
    backgroundColor: `${c.gold}1A`,
  },
  ownerPillText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: c.gold,
  },
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
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  forgotText: {
    ...typography.body,
    color: c.gold,
    fontWeight: '700',
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
  spacer: { flex: 1, minHeight: spacing.lg },
  bottomBlock: { alignItems: 'center', gap: spacing.sm },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  footerMuted: { ...typography.body, color: c.textSecondary },
  footerLink: { ...typography.body, color: c.gold, fontWeight: '700' },
}));

const LOCKOUT_MS = 15 * 60 * 1000;

function roleIncludes(roleValue: string | null | undefined, expected: 'customer' | 'owner'): boolean {
  if (!roleValue) return false;
  const normalized = roleValue.toLowerCase().trim();
  if (!normalized) return false;
  if (normalized === expected || normalized === 'both') return true;
  return normalized.split(/[,\s|/]+/).includes(expected);
}
const MAX_FAILED_ATTEMPTS = 5;

function failuresKey(email: string) {
  return `@seatly/owner_login_failures:${email}`;
}

function lockoutKey(email: string) {
  return `@seatly/owner_login_lockout_until:${email}`;
}

export default function OwnerLoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const [rememberDevice, setRememberDevice] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lockoutUntilMs, setLockoutUntilMs] = useState<number | null>(null);

  const trimmedEmail = email.trim().toLowerCase();
  const isLockedOut = lockoutUntilMs !== null && Date.now() < lockoutUntilMs;

  useEffect(() => {
    let cancelled = false;
    const loadLockout = async () => {
      if (!trimmedEmail) {
        if (!cancelled) setLockoutUntilMs(null);
        return;
      }
      const raw = await AsyncStorage.getItem(lockoutKey(trimmedEmail));
      if (!raw) {
        if (!cancelled) setLockoutUntilMs(null);
        return;
      }
      const until = Date.parse(raw);
      if (Number.isNaN(until) || Date.now() >= until) {
        await AsyncStorage.removeItem(lockoutKey(trimmedEmail));
        if (!cancelled) setLockoutUntilMs(null);
        return;
      }
      if (!cancelled) setLockoutUntilMs(until);
    };
    void loadLockout();
    return () => {
      cancelled = true;
    };
  }, [trimmedEmail]);

  useEffect(() => {
    if (!isLockedOut || lockoutUntilMs === null) return;
    const id = setInterval(() => {
      if (Date.now() >= lockoutUntilMs) {
        setLockoutUntilMs(null);
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isLockedOut, lockoutUntilMs]);

  const enforceOwnerRole = async (userId: string): Promise<boolean> => {
    const supabase = getSupabase();
    if (!supabase) return false;
    const { data } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('auth_user_id', userId)
      .maybeSingle();
    const role = typeof data?.role === 'string' ? data.role.toLowerCase() : '';
    if (roleIncludes(role, 'owner')) return true;
    await supabase.auth.signOut();
    Alert.alert(
      'Access denied',
      'This account is not registered as a restaurant owner. Please create an owner account.',
    );
    return false;
  };

  const handleLogin = async () => {
    if (submitting || isLockedOut) return;
    if (!trimmedEmail || !password) {
      Alert.alert('Missing info', 'Please enter both email and password.');
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      Alert.alert('Supabase not configured', 'Missing Supabase environment variables.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error) {
        const prevRaw = await AsyncStorage.getItem(failuresKey(trimmedEmail));
        const prev = prevRaw ? Math.max(0, parseInt(prevRaw, 10) || 0) : 0;
        const next = prev + 1;
        if (next >= MAX_FAILED_ATTEMPTS) {
          await AsyncStorage.removeItem(failuresKey(trimmedEmail));
          const until = Date.now() + LOCKOUT_MS;
          await AsyncStorage.setItem(lockoutKey(trimmedEmail), new Date(until).toISOString());
          setLockoutUntilMs(until);
          Alert.alert(
            'Too many attempts',
            'Too many failed attempts. Please wait 15 minutes or reset your password.',
          );
          try {
            await sendPasswordResetEmail(trimmedEmail);
          } catch {
            // ignore: reset email is best-effort; lockout still applies
          }
          return;
        }
        await AsyncStorage.setItem(failuresKey(trimmedEmail), String(next));
        Alert.alert('Sign in failed', error.message);
        return;
      }

      await AsyncStorage.multiRemove([failuresKey(trimmedEmail), lockoutKey(trimmedEmail)]);
      setLockoutUntilMs(null);
      const signedInUserId = data.user?.id;
      if (!signedInUserId) {
        Alert.alert('Session error', 'Could not load your account. Please try again.');
        return;
      }
      const allowed = await enforceOwnerRole(signedInUserId);
      if (!allowed) return;
      router.replace('/(staff)');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    if (submitting || isLockedOut) return;
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
        params: { phone: encodeURIComponent(e164), source: 'owner-login' },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await signInWithGoogle();
      if (result.status === 'cancelled') return;
      if (result.status === 'error') {
        Alert.alert('Google sign in failed', result.message);
        return;
      }
      const allowed = await enforceOwnerRole(result.session.user.id);
      if (!allowed) return;
      router.replace('/(staff)');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenWrapper withKeyboardAvoiding padded>
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

        <View style={styles.pillWrap}>
          <View style={styles.ownerPill}>
            <Ionicons name="storefront-outline" size={14} color={c.gold} />
            <Text style={styles.ownerPillText}>{t('auth.restaurantOwner')}</Text>
          </View>
        </View>

        <Text style={styles.heading}>{t('auth.ownerLoginHeading')}</Text>
        <Text style={styles.subcopy}>{t('auth.ownerLoginSubcopy')}</Text>

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

        <View style={styles.rowBetween}>
          <Checkbox checked={rememberDevice} onChange={setRememberDevice} label={t('auth.rememberDevice')} />
          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} hitSlop={8}>
            <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>
        </View>

        <Button
          title={t('auth.ownerSignIn')}
          onPress={handleLogin}
          size="lg"
          disabled={submitting || isLockedOut}
        />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.orPhoneSms')}</Text>
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
          disabled={submitting || isLockedOut}
        />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <SocialAuthButtons
          onApple={() => router.replace('/(staff)')}
          onGoogle={handleGoogle}
        />

        <View style={styles.spacer} />

        <View style={styles.bottomBlock}>
          <View style={styles.footerRow}>
            <Text style={styles.footerMuted}>{t('auth.newToCenaiva')} </Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/owner-register')}
              activeOpacity={0.7}
            >
              <Text style={styles.footerLink}>{t('auth.registerRestaurant')}</Text>
            </TouchableOpacity>
          </View>
          <TermsFooter />
        </View>
      </View>
    </ScreenWrapper>
  );
}
