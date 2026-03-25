import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/lib/theme';
import { ScreenWrapper, Input, Button } from '@/components/ui';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const onSuccess = () => {
    router.replace('/(customer)');
  };

  return (
    <ScreenWrapper scrollable withKeyboardAvoiding padded>
      <View style={[styles.inner, { paddingBottom: Math.max(insets.bottom, spacing['2xl']) }]}>
        <Text style={styles.heading}>{t('auth.register')}</Text>
        <Text style={styles.sub}>{t('auth.registerSubtitle')}</Text>

        <Input icon="person-outline" placeholder={t('auth.fullName')} autoCapitalize="words" />
        <Input
          icon="mail-outline"
          placeholder={t('auth.email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Input icon="call-outline" placeholder={t('auth.phone')} keyboardType="phone-pad" />
        <Input icon="lock-closed-outline" placeholder={t('auth.password')} isPassword />

        <Button title={t('auth.register')} onPress={onSuccess} size="lg" style={styles.primaryBtn} />

        <View style={styles.footerRow}>
          <Text style={styles.footerMuted}>{t('auth.hasAccount')} </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} activeOpacity={0.7}>
            <Text style={styles.footerLink}>{t('auth.login')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  inner: {
    flexGrow: 1,
    paddingTop: spacing.md,
  },
  heading: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sub: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing['2xl'],
  },
  primaryBtn: {
    marginTop: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing['3xl'],
  },
  footerMuted: {
    ...typography.body,
    color: colors.textSecondary,
  },
  footerLink: {
    ...typography.body,
    color: colors.gold,
    fontWeight: '600',
  },
});
