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
    justifyContent: 'space-between',
    paddingVertical: spacing['4xl'],
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing['4xl'],
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
    maxWidth: 330,
  },
  actions: {
    gap: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  primaryAction: {
    backgroundColor: c.gold,
  },
  secondaryAction: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.gold,
  },
  actionPressed: {
    opacity: 0.86,
  },
  primaryActionText: {
    ...typography.bodyLarge,
    color: c.bgBase,
    fontWeight: '700',
  },
  secondaryActionText: {
    ...typography.bodyLarge,
    color: c.gold,
    fontWeight: '700',
  },
  audienceText: {
    ...typography.bodySmall,
    color: c.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
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
        <View style={styles.hero}>
          <Text style={styles.logo}>{t('common.appName')}</Text>
          <Text style={styles.title}>{t('auth.welcomeTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.welcomeTagline')}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.primaryAction,
              pressed && styles.actionPressed,
            ]}
            onPress={() => router.push('/(auth)/login')}
            accessibilityRole="button"
          >
            <Ionicons name="log-in-outline" size={20} color={c.bgBase} />
            <Text style={styles.primaryActionText}>{t('auth.alreadyHaveSignIn')}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.secondaryAction,
              pressed && styles.actionPressed,
            ]}
            onPress={() => router.push('/(auth)/register')}
            accessibilityRole="button"
          >
            <Ionicons name="person-add-outline" size={20} color={c.gold} />
            <Text style={styles.secondaryActionText}>{t('auth.createAccount')}</Text>
          </Pressable>
          <Text style={styles.audienceText}>{t('auth.welcomeAudience')}</Text>
        </View>
      </View>
    </View>
  );
}
