import React from 'react';
import { View, Text, StyleSheet, Linking, Pressable } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { Card } from '@/components/ui';
import { useColors, createStyles, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { ACK_URL } from '@/lib/config/legalLinks';
import { LEGAL_EMAIL } from '@/lib/config/contactInfo';
import { isLoyaltyEnabled } from '@/lib/config/loyaltyFeature';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const useStyles = createStyles((c) => ({
  brand: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: c.gold,
    letterSpacing: 4,
  },
  tagline: {
    ...typography.body,
    color: c.textSecondary,
    marginTop: spacing.sm,
  },
  version: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: spacing.md,
  },
  aboutCard: {
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  aboutText: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 22,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  linkText: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  contactCard: {
    marginTop: spacing.lg,
    ...shadows.card,
  },
  contactLabel: {
    ...typography.label,
    color: c.textMuted,
    marginBottom: spacing.sm,
  },
  contactEmail: {
    ...typography.bodyLarge,
    color: c.gold,
    fontWeight: '700',
  },
  contactHint: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: spacing.xs,
  },
}));

export default function AboutScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();

  const open = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };
  const goTo = (path: string) => {
    router.push(path as never);
  };

  return (
    <ProfileStackScreen title={t('profile.about')}>
      <View style={styles.brand}>
        <Text style={styles.logo}>CENAIVA</Text>
        <Text style={styles.tagline}>Premium dining, reserved.</Text>
        <Text style={styles.version}>Version {APP_VERSION}</Text>
      </View>

      <Card style={styles.aboutCard}>
        <Text style={styles.aboutText}>
          {isLoyaltyEnabled()
            ? 'Cenaiva connects diners with exceptional restaurants — from last-minute tables to loyalty rewards. Built in Toronto for food lovers everywhere (demo company copy).'
            : 'Cenaiva connects diners with exceptional restaurants — from last-minute tables to unforgettable nights out. Built in Toronto for food lovers everywhere (demo company copy).'}
        </Text>
      </Card>

      {/* In-app legal screens (read without leaving the app). All five
          live under app/(customer)/profile/legal/*. The web fallback
          URLs in legalLinks.ts are kept env-overridable for the day
          we want to deep-link to cenaiva.com instead. */}
      <Pressable style={styles.linkRow} onPress={() => goTo('/(customer)/profile/legal/terms')}>
        <Ionicons name="document-text-outline" size={20} color={c.gold} />
        <Text style={styles.linkText}>Terms of Service</Text>
        <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
      </Pressable>
      <Pressable style={styles.linkRow} onPress={() => goTo('/(customer)/profile/legal/privacy-policy')}>
        <Ionicons name="shield-checkmark-outline" size={20} color={c.gold} />
        <Text style={styles.linkText}>Privacy Policy</Text>
        <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
      </Pressable>
      <Pressable style={styles.linkRow} onPress={() => goTo('/(customer)/profile/legal/partner-agreement')}>
        <Ionicons name="business-outline" size={20} color={c.gold} />
        <Text style={styles.linkText}>Restaurant Partner Agreement</Text>
        <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
      </Pressable>
      <Pressable style={styles.linkRow} onPress={() => goTo('/(customer)/profile/legal/sub-processors')}>
        <Ionicons name="server-outline" size={20} color={c.gold} />
        <Text style={styles.linkText}>Sub-Processors</Text>
        <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
      </Pressable>
      <Pressable style={styles.linkRow} onPress={() => goTo('/(customer)/profile/legal/agreement-history')}>
        <Ionicons name="time-outline" size={20} color={c.gold} />
        <Text style={styles.linkText}>Agreement History</Text>
        <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
      </Pressable>
      <Pressable style={styles.linkRow} onPress={() => goTo('/(customer)/profile/legal/licenses')}>
        <Ionicons name="heart-outline" size={20} color={c.gold} />
        <Text style={styles.linkText}>Open-source acknowledgements</Text>
        <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
      </Pressable>

      <Card style={styles.contactCard}>
        <Text style={styles.contactLabel}>Contact</Text>
        <Text style={styles.contactEmail}>{LEGAL_EMAIL}</Text>
        <Text style={styles.contactHint}>For partnerships and press inquiries</Text>
      </Card>
    </ProfileStackScreen>
  );
}
