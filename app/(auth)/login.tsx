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
}));

const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

function failuresKey(email: string) {
  return `@seatly/login_failures:${email}`;
}

function lockoutKey(email: string) {
  return `@seatly/login_lockout_until:${email}`;
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
      const { error } = await supabase.auth.signInWithPassword({
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
      router.replace('/(customer)');
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
          <View style={styles.pill}>
            <Ionicons name="person-outline" size={14} color={c.textPrimary} />
            <Text style={styles.pillText}>{t('auth.diner')}</Text>
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
        />
        <Input
          icon="lock-closed-outline"
          placeholder={t('auth.password')}
          isPassword
          value={password}
          onChangeText={setPassword}
        />

        <View style={styles.rowBetween}>
          <Checkbox checked={keepSignedIn} onChange={setKeepSignedIn} label={t('auth.keepSignedIn')} />
          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} hitSlop={8}>
            <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>
        </View>

        <Button
          title={t('auth.login')}
          onPress={handleLogin}
          size="lg"
          disabled={submitting || isLockedOut}
        />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <SocialAuthButtons
          onApple={() => router.replace('/(customer)')}
          onGoogle={() => router.replace('/(customer)')}
        />

        <View style={styles.spacer} />

        <View style={styles.bottomBlock}>
          <View style={styles.footerRow}>
            <Text style={styles.footerMuted}>{t('auth.noAccount')} </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')} activeOpacity={0.7}>
              <Text style={styles.footerLink}>{t('auth.welcomeSignUpCta')}</Text>
            </TouchableOpacity>
          </View>
          <TermsFooter />
        </View>
      </View>
    </ScreenWrapper>
  );
}
