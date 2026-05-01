import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

const useStyles = createStyles((c) => ({
  root: {
    flex: 1,
    backgroundColor: c.bgBase,
    paddingHorizontal: spacing.xl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: c.gold,
    letterSpacing: 7,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
  },
  title: {
    ...typography.h1,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: c.textMuted,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
  },
  cards: {
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 86,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  cardPressed: {
    opacity: 0.86,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  iconWrapOwner: {
    backgroundColor: `${c.gold}18`,
  },
  cardText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  cardSub: {
    ...typography.bodySmall,
    color: c.textMuted,
  },
  arrowWrap: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  signUpRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  signUpPrompt: {
    ...typography.body,
    color: c.textSecondary,
  },
  signUpCta: {
    ...typography.body,
    color: c.gold,
    fontWeight: '700',
  },
}));

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, spacing.lg), paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
      <View style={styles.content}>
        <Text style={styles.logo}>{t('common.appName')}</Text>
        <Text style={styles.title}>{t('auth.welcomeTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.welcomeTagline')}</Text>

        <View style={styles.cards}>
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push('/(auth)/login')}
            accessibilityRole="button"
          >
            <View style={styles.iconWrap}>
              <Ionicons name="person-outline" size={23} color={c.gold} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Continue as a diner</Text>
              <Text style={styles.cardSub}>Book tables, discover spots, and earn rewards</Text>
            </View>
            <View style={styles.arrowWrap}>
              <Ionicons name="chevron-forward" size={17} color={c.textMuted} />
            </View>
          </Pressable>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={() => router.push('/(auth)/register')}
          style={styles.signUpRow}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={styles.signUpPrompt}>{t('auth.welcomeSignUpPrompt')} </Text>
          <Text style={styles.signUpCta}>{t('auth.welcomeSignUpCta')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
