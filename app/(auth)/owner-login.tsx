import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';
import { ScreenWrapper, Input, Button } from '@/components/ui';

export default function OwnerLoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScreenWrapper withKeyboardAvoiding padded>
      <View style={[styles.inner, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <TouchableOpacity
          onPress={() => router.push('/(auth)/welcome')}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
          <Text style={styles.backText}>{t('auth.backToWelcome')}</Text>
        </TouchableOpacity>

        <Text style={styles.logo}>{t('common.appName')}</Text>

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Ionicons name="storefront-outline" size={14} color={colors.bgBase} />
            <Text style={styles.badgeText}>{t('auth.restaurantOwner')}</Text>
          </View>
        </View>

        <Text style={styles.heading}>{t('auth.ownerSignIn')}</Text>
        <Text style={styles.tagline}>{t('auth.restaurantOwnerTagline')}</Text>

        <View style={styles.form}>
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

          <Button
            title={t('auth.ownerSignIn')}
            onPress={() => router.replace('/(staff)')}
            size="lg"
          />

          {Platform.OS === 'ios' && (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
                <View style={styles.dividerLine} />
              </View>
              <Button
                title={t('auth.continueWithApple')}
                variant="outlined"
                onPress={() => router.replace('/(staff)')}
                size="lg"
              />
            </>
          )}
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerMuted}>{t('auth.newToCenaiva')} </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/owner-register')}
            activeOpacity={0.7}
          >
            <Text style={styles.footerLink}>{t('auth.registerRestaurant')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    paddingTop: spacing.md,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing['2xl'],
  },
  backText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  logo: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  badgeRow: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.gold,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.bgBase,
    letterSpacing: 0.5,
  },
  heading: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing['2xl'],
  },
  form: {
    flex: 1,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
  forgotText: {
    ...typography.body,
    color: colors.gold,
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
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textTransform: 'lowercase',
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
