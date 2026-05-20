import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import { getSupabase } from '@/lib/supabase/client';
import { key as storageKey } from '@/lib/storage/keys';
import { sendPasswordResetEmail } from '@/lib/services/accountSecurity';
import { ensureCustomerProfile, signInWithApple, signInWithGoogle } from '@/lib/services/oauth';
import { normalizePhoneToE164, sendPhoneOtp } from '@/lib/services/phoneAuth';
import { getRoleForSignedInUser } from '@/lib/auth/postSignInRouting';
import { MAX_FAILED_ATTEMPTS } from '@/lib/auth/lockoutPolicy';
import { recordAuthAttempt } from '@/lib/auth/authAttempts';
import { recordSignIn } from '@/lib/auth/recordSignIn';
import { normalizeEmail } from '@/lib/validation/input';
import { friendlyError } from '@/lib/errors/friendlyError';
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
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
  },
  pillText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: c.textPrimary,
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
  bottomBlock: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  footerMuted: { ...typography.body, color: c.textSecondary },
  footerLink: { ...typography.body, color: c.gold, fontWeight: '700' },
  lockoutBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.danger,
    backgroundColor: `${c.danger}1A`,
  },
  lockoutTitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: c.danger,
    marginBottom: 2,
  },
  lockoutBody: {
    ...typography.bodySmall,
    color: c.textPrimary,
  },
  lockoutReset: {
    color: c.gold,
    fontWeight: '700',
  },
}));

function failuresKey(email: string) {
  return storageKey(`login_failures:${email}`);
}

function lockoutKey(email: string) {
  return storageKey(`login_lockout_until:${email}`);
}

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lockoutUntilMs, setLockoutUntilMs] = useState<number | null>(null);

  const trimmedEmail = normalizeEmail(email) ?? '';
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const isLockedOut = lockoutUntilMs !== null && nowMs < lockoutUntilMs;
  const lockoutMsRemaining = isLockedOut && lockoutUntilMs !== null ? lockoutUntilMs - nowMs : 0;

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
      const now = Date.now();
      setNowMs(now);
      if (now >= lockoutUntilMs) {
        setLockoutUntilMs(null);
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isLockedOut, lockoutUntilMs]);

  const routeSignedInSession = async (session: Session) => {
    // Tell the server about this sign-in. If the device fingerprint
    // hasn't been seen before for this user, the server queues a
    // "new device sign-in" email alert (fire-and-forget — never blocks
    // the route).
    void recordSignIn();
    const role = await getRoleForSignedInUser(session.user.id, session.user);
    if (!role) {
      try {
        await ensureCustomerProfile(session);
      } catch {
        // best-effort: profile creation can be retried later
      }
    }
    // getRoleForSignedInUser takes ~200ms (DB round-trip), which gives React
    // enough time to commit the isAuthenticated = true update from
    // onAuthStateChange. The customer/staff layout auth guards use useEffect
    // (not Redirect), so they fire after commit and see isAuthenticated = true.
    const dest = role === 'owner' ? '/(staff)/home' : '/(customer)/discover';
    router.replace(dest as never);
  };

  const handleLogin = async () => {
    if (submitting || isLockedOut) return;
    if (!trimmedEmail || !password) {
      Alert.alert('Missing info', friendlyError(undefined, 'Please enter both email and password.'));
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      Alert.alert('Supabase not configured', friendlyError(undefined, 'Missing Supabase environment variables.'));
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      // Tell the server about this attempt (success or failure) and let
      // it decide the post-attempt lockout state. Server's locked_until
      // is authoritative — AsyncStorage is preserved only as a fast
      // local cache for the next app launch. See migration
      // 20260517110000_add_auth_attempts.sql.
      const attempt = await recordAuthAttempt(trimmedEmail, !error);

      if (error) {
        // Update the cache from the server response so the lockout
        // banner can render instantly on next launch.
        if (attempt.lockedUntilMs) {
          await AsyncStorage.setItem(
            lockoutKey(trimmedEmail),
            new Date(attempt.lockedUntilMs).toISOString(),
          );
          await AsyncStorage.removeItem(failuresKey(trimmedEmail));
          setLockoutUntilMs(attempt.lockedUntilMs);
          Alert.alert(
            'Too many attempts',
            friendlyError(undefined, 'Too many failed attempts. Please wait 15 minutes or reset your password.'),
          );
          try {
            await sendPasswordResetEmail(trimmedEmail);
          } catch {
            // ignore: reset email is best-effort; lockout still applies
          }
          return;
        }
        // Not locked yet — track the failure count locally for the UI
        // hint. Server has the authoritative count too.
        const failuresUsed = Math.max(0, MAX_FAILED_ATTEMPTS - attempt.attemptsRemaining);
        await AsyncStorage.setItem(failuresKey(trimmedEmail), String(failuresUsed));
        Alert.alert('Sign in failed', friendlyError(error, 'Wrong email or password.'));
        return;
      }
      await AsyncStorage.multiRemove([failuresKey(trimmedEmail), lockoutKey(trimmedEmail)]);
      setLockoutUntilMs(null);
      if (!data.session?.user?.id) {
        Alert.alert('Session error', friendlyError(undefined, 'Could not load your account. Please try again.'));
        return;
      }
      await routeSignedInSession(data.session);
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
        friendlyError(undefined, 'Please enter a valid phone number (include country code, or 10-digit US number).'),
      );
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await sendPhoneOtp(e164);
      if (error) {
        Alert.alert('SMS failed', friendlyError(error, "Couldn't send the code. Please try again."));
        return;
      }
      router.push({
        pathname: '/(auth)/verify-phone-otp',
        params: { phone: encodeURIComponent(e164), source: 'login' },
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
        Alert.alert('Google sign in failed', friendlyError(result.message, "Couldn't sign in with Google. Please try again."));
        return;
      }
      await routeSignedInSession(result.session);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApple = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await signInWithApple();
      if (result.status === 'cancelled') return;
      if (result.status === 'error') {
        Alert.alert('Apple sign in failed', friendlyError(result.message, "Couldn't sign in with Apple. Please try again."));
        return;
      }
      await routeSignedInSession(result.session);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <ScreenWrapper withKeyboardAvoiding padded scrollable>
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
          <View style={styles.pill}>
            <Ionicons name="people-outline" size={14} color={c.textPrimary} />
            <Text style={styles.pillText}>{t('auth.customerOrOwner')}</Text>
          </View>
        </View>

        <Text style={styles.heading}>{t('auth.welcomeBack')}</Text>
        <Text style={styles.subcopy}>{t('auth.loginSubcopyShort')}</Text>

        <Input
          icon="mail-outline"
          placeholder={t('auth.email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          testID="login-email-input"
          accessibilityLabel={t('auth.email')}
        />
        <Input
          icon="lock-closed-outline"
          placeholder={t('auth.password')}
          isPassword
          value={password}
          onChangeText={setPassword}
          testID="login-password-input"
          accessibilityLabel={t('auth.password')}
        />

        <View style={styles.rowBetween}>
          <Checkbox checked={keepSignedIn} onChange={setKeepSignedIn} label={t('auth.keepSignedIn')} />
          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} hitSlop={8}>
            <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>
        </View>

        {isLockedOut ? (
          <View style={styles.lockoutBanner}>
            <Ionicons name="lock-closed" size={18} color={c.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.lockoutTitle}>{t('auth.lockoutTitle')}</Text>
              <Text style={styles.lockoutBody}>
                {lockoutMsRemaining >= 60_000
                  ? t('auth.lockoutBodyMinutes', { minutes: Math.ceil(lockoutMsRemaining / 60_000) })
                  : t('auth.lockoutBodySeconds', { seconds: Math.max(1, Math.ceil(lockoutMsRemaining / 1000)) })}{' '}
                <Text
                  style={styles.lockoutReset}
                  onPress={() => router.push('/(auth)/forgot-password')}
                >
                  {t('auth.forgotPassword')}
                </Text>
              </Text>
            </View>
          </View>
        ) : null}

        <Button
          title={t('auth.login')}
          onPress={handleLogin}
          size="lg"
          disabled={submitting || isLockedOut}
          testID="login-submit-button"
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

        <SocialAuthButtons onApple={handleApple} onGoogle={handleGoogle} />

        <TermsFooter />

        <View style={styles.spacer} />

        <View style={styles.bottomBlock}>
          <View style={styles.footerRow}>
            <Text style={styles.footerMuted}>{t('auth.noAccount')} </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')} activeOpacity={0.7}>
              <Text style={styles.footerLink}>{t('auth.welcomeSignUpCta')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScreenWrapper>
    </>
  );
}
