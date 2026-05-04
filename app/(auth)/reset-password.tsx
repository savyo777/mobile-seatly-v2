import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '@/components/ui';
import { createStyles, useColors, spacing, borderRadius, typography } from '@/lib/theme';
import { getSupabase } from '@/lib/supabase/client';

const useStyles = createStyles((c) => ({
  inner: {
    flex: 1,
    paddingTop: spacing.xl,
  },
  heading: {
    ...typography.h2,
    color: c.textPrimary,
    marginBottom: spacing.sm,
  },
  sub: {
    ...typography.body,
    color: c.textSecondary,
    marginBottom: spacing.xl,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    color: c.textMuted,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    borderRadius: borderRadius.md,
    backgroundColor: c.bgSurface,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: c.textPrimary,
    fontSize: 15,
  },
  error: {
    ...typography.bodySmall,
    color: c.danger,
    marginTop: spacing.xs,
  },
  submitBtn: {
    backgroundColor: c.gold,
    borderRadius: borderRadius.lg,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1200',
  },
}));

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const styles = useStyles();
  const params = useLocalSearchParams<{ recovery?: string }>();

  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [canReset, setCanReset] = useState(params.recovery === '1');

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setCanReset(true);
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const validate = () => {
    if (nextPassword.length < 8) return t('profile.passwordTooShort');
    if (!/[A-Z]/.test(nextPassword) || !/[a-z]/.test(nextPassword) || !/\d/.test(nextPassword)) {
      return t('profile.passwordTooWeak');
    }
    if (nextPassword !== confirmPassword) return t('profile.passwordMismatch');
    return '';
  };

  const onSubmit = async () => {
    if (submitting) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      Alert.alert('Supabase not configured', 'Missing Supabase environment variables.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: nextPassword,
      });
      if (updateError) {
        Alert.alert('Reset failed', updateError.message);
        return;
      }
      Alert.alert('Password updated', 'You can now sign in with your new password.', [
        {
          text: 'OK',
          onPress: () => router.replace('/(auth)/login'),
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  const ready = nextPassword.length > 0 && confirmPassword.length > 0 && !submitting;

  return (
    <ScreenWrapper withKeyboardAvoiding padded scrollable>
      <View style={styles.inner}>
        {!canReset ? (
          <ActivityIndicator color={c.gold} />
        ) : null}
        {canReset ? (
          <>
        <Text style={styles.heading}>{t('auth.resetPassword')}</Text>
        <Text style={styles.sub}>{t('auth.resetPasswordDescription')}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>{t('profile.newPassword')}</Text>
          <TextInput
            value={nextPassword}
            onChangeText={setNextPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('profile.newPassword')}
            placeholderTextColor={c.textMuted}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('profile.confirmPassword')}</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('profile.confirmPassword')}
            placeholderTextColor={c.textMuted}
            style={styles.input}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <Pressable
          onPress={onSubmit}
          disabled={!ready}
          style={[styles.submitBtn, !ready && styles.submitBtnDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color="#1A1200" />
          ) : (
            <Text style={styles.submitText}>{t('profile.changePassword')}</Text>
          )}
        </Pressable>
          </>
        ) : null}
      </View>
    </ScreenWrapper>
  );
}
