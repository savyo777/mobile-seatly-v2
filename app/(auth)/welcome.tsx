import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/theme';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        { paddingTop: Math.max(insets.top, spacing['3xl']), paddingBottom: Math.max(insets.bottom, spacing['3xl']) },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>{t('common.appName')}</Text>
        <Text style={styles.subtitle}>{t('auth.welcomeSubtitle')}</Text>
      </View>

      <View style={styles.cards}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => router.push('/(auth)/login')}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="person-outline" size={36} color={colors.gold} />
          </View>
          <Text style={styles.cardTitle}>{t('auth.iAmADiner')}</Text>
          <Text style={styles.cardSub}>{t('auth.iAmADinerSub')}</Text>
          <View style={styles.cardArrow}>
            <Ionicons name="arrow-forward" size={18} color={colors.gold} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.cardOwner]}
          activeOpacity={0.85}
          onPress={() => router.push('/(auth)/owner-login')}
        >
          <View style={[styles.iconWrap, styles.iconWrapOwner]}>
            <Ionicons name="storefront-outline" size={36} color={colors.bgBase} />
          </View>
          <Text style={[styles.cardTitle, styles.cardTitleOwner]}>{t('auth.iManageARestaurant')}</Text>
          <Text style={[styles.cardSub, styles.cardSubOwner]}>{t('auth.iManageARestaurantSub')}</Text>
          <View style={styles.cardArrow}>
            <Ionicons name="arrow-forward" size={18} color={colors.bgBase} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Seatly · Your table awaits</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBase,
    paddingHorizontal: spacing['2xl'],
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing['4xl'],
  },
  logo: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 8,
    marginBottom: spacing.lg,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  cards: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: colors.gold,
    padding: spacing['2xl'],
    position: 'relative',
    ...shadows.card,
  },
  cardOwner: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    ...shadows.goldGlow,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconWrapOwner: {
    backgroundColor: colors.goldDark,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  cardTitleOwner: {
    color: colors.bgBase,
  },
  cardSub: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  cardSubOwner: {
    color: colors.bgBase,
    opacity: 0.75,
  },
  cardArrow: {
    position: 'absolute',
    top: spacing['2xl'],
    right: spacing['2xl'],
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
});
