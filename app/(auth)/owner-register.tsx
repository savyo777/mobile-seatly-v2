import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors, createStyles, spacing, typography, borderRadius } from '@/lib/theme';
import { Input, Button, SocialAuthButtons, TermsFooter } from '@/components/ui';

const useStyles = createStyles((c) => ({
  root: {
    flex: 1,
    backgroundColor: c.bgBase,
  },
  scroll: {
    paddingHorizontal: spacing['2xl'],
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
    color: c.textSecondary,
  },
  logo: {
    fontSize: 36,
    fontWeight: '700',
    color: c.gold,
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
    backgroundColor: c.gold,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.bgBase,
    letterSpacing: 0.5,
  },
  heading: {
    ...typography.h2,
    color: c.textPrimary,
    marginBottom: spacing.sm,
  },
  tagline: {
    ...typography.body,
    color: c.textSecondary,
    marginBottom: spacing['2xl'],
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionLabelText: {
    ...typography.label,
    color: c.gold,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginVertical: spacing['2xl'],
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing['2xl'],
  },
  termsText: {
    ...typography.bodySmall,
    color: c.textMuted,
    flex: 1,
    lineHeight: 18,
  },
  termsLink: {
    color: c.gold,
    fontWeight: '600',
  },
  ctaBtn: {
    marginBottom: spacing.lg,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.sm,
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
  termsBottom: {},
}));

export default function OwnerRegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + spacing['3xl'], 48) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => router.push('/(auth)/owner-login')}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={20} color={c.textSecondary} />
          <Text style={styles.backText}>{t('auth.backToWelcome')}</Text>
        </TouchableOpacity>

        <Text style={styles.logo}>{t('common.appName')}</Text>

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Ionicons name="storefront-outline" size={14} color={c.bgBase} />
            <Text style={styles.badgeText}>{t('auth.restaurantOwner')}</Text>
          </View>
        </View>

        <Text style={styles.heading}>{t('auth.registerRestaurant')}</Text>
        <Text style={styles.tagline}>{t('auth.restaurantOwnerTagline')}</Text>

        <View style={styles.sectionLabel}>
          <Ionicons name="person-circle-outline" size={16} color={c.gold} />
          <Text style={styles.sectionLabelText}>Your Account</Text>
        </View>

        <Input
          icon="person-outline"
          placeholder={t('auth.fullName')}
          autoCapitalize="words"
          autoCorrect={false}
        />
        <Input
          icon="mail-outline"
          placeholder={t('auth.email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Input
          icon="call-outline"
          placeholder={t('auth.phone')}
          keyboardType="phone-pad"
        />
        <Input
          icon="lock-closed-outline"
          placeholder={t('auth.password')}
          isPassword
        />

        <View style={styles.divider} />

        <View style={styles.sectionLabel}>
          <Ionicons name="storefront-outline" size={16} color={c.gold} />
          <Text style={styles.sectionLabelText}>Your Restaurant</Text>
        </View>

        <Input
          icon="business-outline"
          placeholder={t('auth.restaurantName')}
          autoCapitalize="words"
          autoCorrect={false}
        />
        <Input
          icon="restaurant-outline"
          placeholder={t('auth.cuisineType')}
          autoCapitalize="words"
          autoCorrect={false}
        />

        <Button
          title={t('auth.createAccount')}
          onPress={() => router.replace('/(staff)')}
          size="lg"
          style={styles.ctaBtn}
        />

        <View style={styles.divider} />

        <SocialAuthButtons
          onApple={() => router.replace('/(staff)')}
          onGoogle={() => router.replace('/(staff)')}
        />

        <View style={styles.footerRow}>
          <Text style={styles.footerMuted}>{t('auth.alreadyHaveAccount')} </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/owner-login')}
            activeOpacity={0.7}
          >
            <Text style={styles.footerLink}>{t('auth.ownerSignIn')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.termsBottom}>
          <TermsFooter />
        </View>
      </ScrollView>
    </View>
  );
}
