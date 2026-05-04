import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors, createStyles, spacing, typography } from '@/lib/theme';
import { ScreenWrapper, Input, Button } from '@/components/ui';
import { getSupabase } from '@/lib/supabase/client';

const RESET_PASSWORD_REDIRECT = 'cenaiva://reset-password';

const useStyles = createStyles((c) => ({
  inner: {
    flex: 1,
    paddingTop: spacing.sm,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: spacing['3xl'],
    gap: 4,
  },
  backText: {
    ...typography.bodyLarge,
    color: c.gold,
    fontWeight: '600',
  },
  heading: {
    ...typography.h2,
    color: c.textPrimary,
    marginBottom: spacing.md,
  },
  description: {
    ...typography.bodyLarge,
    color: c.textSecondary,
    marginBottom: spacing['2xl'],
    lineHeight: 24,
  },
  confirm: {
    alignItems: 'center',
    paddingTop: spacing['2xl'],
  },
  confirmIconWrap: {
    marginBottom: spacing['2xl'],
  },
  confirmTitle: {
    ...typography.h2,
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  confirmBody: {
    ...typography.bodyLarge,
    color: c.textSecondary,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
    paddingHorizontal: spacing.md,
    lineHeight: 24,
  },
  backToLogin: {
    marginTop: spacing.md,
  },
}));

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSend = async () => {
    if (submitting) return;
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      Alert.alert('Missing email', 'Please enter your email address.');
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      Alert.alert('Supabase not configured', 'Missing Supabase environment variables.');
      return;
    }
    setSubmitting(true);
    const redirectTo = RESET_PASSWORD_REDIRECT;
    console.log('Reset redirect URL:', redirectTo);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo });
    setSubmitting(false);
    if (error) {
      Alert.alert('Reset failed', error.message);
      return;
    }
    setSubmitted(true);
  };

  return (
    <ScreenWrapper withKeyboardAvoiding padded scrollable>
      <View style={[styles.inner, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backRow, { marginTop: spacing.xs }]}
          hitSlop={12}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={c.gold} />
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>

        {!submitted ? (
          <>
            <Text style={styles.heading}>{t('auth.resetPassword')}</Text>
            <Text style={styles.description}>{t('auth.resetPasswordDescription')}</Text>

            <Input
              icon="mail-outline"
              placeholder={t('auth.email')}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Button title={t('auth.sendResetLink')} onPress={onSend} size="lg" disabled={submitting} />
          </>
        ) : (
          <View style={styles.confirm}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="mail-unread-outline" size={56} color={c.gold} />
            </View>
            <Text style={styles.confirmTitle}>{t('auth.resetEmailSent')}</Text>
            <Text style={styles.confirmBody}>{t('auth.resetEmailSentDescription')}</Text>
            <Button title={t('auth.login')} onPress={() => router.replace('/(auth)/login')} size="lg" style={styles.backToLogin} />
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}
