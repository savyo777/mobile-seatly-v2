import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
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

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const [keepSignedIn, setKeepSignedIn] = useState(true);

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
        />
        <Input icon="lock-closed-outline" placeholder={t('auth.password')} isPassword />

        <View style={styles.rowBetween}>
          <Checkbox checked={keepSignedIn} onChange={setKeepSignedIn} label={t('auth.keepSignedIn')} />
          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} hitSlop={8}>
            <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>
        </View>

        <Button title={t('auth.login')} onPress={() => router.replace('/(customer)')} size="lg" />

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
