import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createStyles, spacing, typography, useColors } from '@/lib/theme';
import { ScreenWrapper, Input, Button } from '@/components/ui';
import { ensureCustomerProfile, ensureOwnerProfile } from '@/lib/services/oauth';
import { sendPhoneOtp, verifyPhoneOtp } from '@/lib/services/phoneAuth';
import { getSupabase } from '@/lib/supabase/client';
import { roleIncludes } from '@/lib/auth/roles';
import { resolveHomeForSignedInUser, type AuthHomeHref } from '@/lib/auth/postSignInRouting';

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
    paddingHorizontal: spacing.lg,
  },
  resendWrap: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  resendText: {
    ...typography.body,
    color: c.gold,
    fontWeight: '700',
    textAlign: 'center',
  },
}));

export default function VerifyPhoneOtpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const params = useLocalSearchParams<{ phone?: string; source?: string; fullName?: string }>();

  const phone = useMemo(() => {
    const raw = params.phone;
    if (!raw || typeof raw !== 'string') return '';
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [params.phone]);

  const fullNameOverride = useMemo(() => {
    const raw = params.fullName;
    if (!raw || typeof raw !== 'string') return '';
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [params.fullName]);

  const source =
    params.source === 'register' ||
    params.source === 'owner-register' ||
    params.source === 'owner-login'
      ? params.source
      : 'login';

  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(60);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = setInterval(() => {
      setResendSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [resendSeconds]);

  const enforceRole = async (userId: string, expected: 'customer' | 'owner'): Promise<boolean> => {
    const supabase = getSupabase();
    if (!supabase) return false;
    const { data } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('auth_user_id', userId)
      .maybeSingle();
    const role = typeof data?.role === 'string' ? data.role.toLowerCase() : '';
    if (roleIncludes(role, expected)) return true;
    await supabase.auth.signOut();
    if (expected === 'owner') {
      Alert.alert(
        'Access denied',
        'This account is not registered as a restaurant owner. Please create an owner account.',
      );
    } else {
      Alert.alert(
        'Access denied',
        'This account is not registered as a customer. Please create a customer account.',
      );
    }
    return false;
  };

  const goBack = () => {
    if (source === 'register') {
      router.replace('/(auth)/register');
    } else if (source === 'owner-register') {
      router.replace('/(auth)/owner-register');
    } else if (source === 'owner-login') {
      router.replace('/(auth)/owner-login');
    } else {
      router.replace('/(auth)/login');
    }
  };

  const onVerify = async () => {
    if (submitting) return;
    if (!phone) {
      Alert.alert('Missing phone', 'Please start again from the sign-in screen.');
      return;
    }
    setSubmitting(true);
    try {
      const { session, error } = await verifyPhoneOtp(phone, otp);
      if (error) {
        Alert.alert('Verification failed', error);
        return;
      }
      if (!session) {
        Alert.alert('Session error', 'Could not load your session. Please try again.');
        return;
      }
      let nextHref: AuthHomeHref = '/(customer)';
      if (source === 'owner-login') {
        const allowed = await enforceRole(session.user.id, 'owner');
        if (!allowed) return;
        nextHref = '/(staff)';
      } else if (source === 'login') {
        const { href, role } = await resolveHomeForSignedInUser(session.user.id, session.user);
        if (!role) {
          try {
            await ensureCustomerProfile(session);
          } catch {
            // best-effort fallback for older accounts with no profile row
          }
        }
        nextHref = href;
      } else if (source === 'owner-register') {
        try {
          await ensureOwnerProfile(session, {
            fullNameOverride: fullNameOverride || undefined,
          });
        } catch {
          // best-effort
        }
        nextHref = '/(staff)';
      } else {
        try {
          await ensureCustomerProfile(session, {
            fullNameOverride: fullNameOverride || undefined,
          });
        } catch {
          // best-effort
        }
      }
      router.replace(nextHref);
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (!phone || submitting || resendSeconds > 0) return;
    setSubmitting(true);
    try {
      const { error } = await sendPhoneOtp(phone);
      if (error) {
        Alert.alert('Resend failed', error);
        return;
      }
      setResendSeconds(60);
      Alert.alert('Code sent', 'We sent a new code to your phone.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenWrapper withKeyboardAvoiding padded>
      <View style={[styles.inner, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7} hitSlop={12}>
            <Ionicons name="chevron-back" size={20} color={c.textSecondary} />
            <Text style={styles.backText}>{t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.brandText}>{t('common.appName')}</Text>
          <View style={styles.topRight} />
        </View>

        <Text style={styles.heading}>{t('auth.verifySmsTitle')}</Text>
        <Text style={styles.subcopy}>
          {t('auth.verifySmsSub', { phone: phone || 'your number' })}
        </Text>

        <Input
          icon="keypad-outline"
          placeholder={t('auth.otpCode')}
          keyboardType="number-pad"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={6}
          value={otp}
          onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
        />

        <Button title={t('auth.verifySmsCta')} onPress={onVerify} size="lg" disabled={submitting || otp.length !== 6} />

        <TouchableOpacity
          onPress={onResend}
          disabled={submitting || !phone || resendSeconds > 0}
          style={styles.resendWrap}
          activeOpacity={0.7}
        >
          <Text style={styles.resendText}>
            {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : t('auth.resendSms')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}
