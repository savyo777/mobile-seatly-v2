import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, createStyles, spacing, typography } from '@/lib/theme';
import { ScreenWrapper, Input, Button } from '@/components/ui';

const useStyles = createStyles((c) => ({
  inner: {
    flex: 1,
    paddingTop: spacing.md,
  },
  logo: {
    fontSize: 36,
    fontWeight: '700',
    color: c.gold,
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
  },
  heading: {
    ...typography.h2,
    color: c.textPrimary,
    marginBottom: spacing['2xl'],
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
  forgotText: {
    ...typography.body,
    color: c.gold,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing['2xl'],
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
  appleBtn: {
    marginTop: spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing['3xl'],
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
  ownerLinkWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  ownerLinkText: {
    ...typography.bodySmall,
    color: c.textMuted,
  },
  ownerLinkCta: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '600',
  },
}));

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();

  return (
    <ScreenWrapper withKeyboardAvoiding padded>
      <View style={[styles.inner, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <Text style={styles.logo}>{t('common.appName')}</Text>

        <Text style={styles.heading}>{t('auth.welcomeBack')}</Text>

        <Input
          icon="mail-outline"
          placeholder={t('auth.email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Input icon="lock-closed-outline" placeholder={t('auth.password')} isPassword />

        <TouchableOpacity
          onPress={() => router.push('/(auth)/forgot-password')}
          style={styles.forgotWrap}
          activeOpacity={0.7}
        >
          <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
        </TouchableOpacity>

        <Button title={t('auth.login')} onPress={() => router.replace('/(customer)')} size="lg" />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          title={t('auth.continueWithGoogle')}
          variant="outlined"
          onPress={() => router.replace('/(customer)')}
          size="lg"
        />

        {Platform.OS === 'ios' && (
          <Button
            title={t('auth.continueWithApple')}
            variant="outlined"
            onPress={() => router.replace('/(customer)')}
            size="lg"
            style={styles.appleBtn}
          />
        )}

        <View style={styles.footerRow}>
          <Text style={styles.footerMuted}>{t('auth.noAccount')} </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')} activeOpacity={0.7}>
            <Text style={styles.footerLink}>{t('auth.register')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/owner-login')}
          style={styles.ownerLinkWrap}
          activeOpacity={0.7}
        >
          <Text style={styles.ownerLinkText}>{t('auth.areYouOwner')} </Text>
          <Text style={styles.ownerLinkCta}>{t('auth.signInAsOwner')}</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}
