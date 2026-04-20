import React from 'react';
import { View, Text, StyleSheet, Linking, Pressable } from 'react-native';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { Card } from '@/components/ui';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/theme';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function AboutScreen() {
  const { t } = useTranslation();

  const open = (url: string) => {
    Linking.openURL(url).catch(() => {});
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
          Cenaiva connects diners with exceptional restaurants — from last-minute tables to loyalty rewards. Built in
          Toronto for food lovers everywhere (demo company copy).
        </Text>
      </Card>

      <Pressable style={styles.linkRow} onPress={() => open('https://cenaiva.app/terms')}>
        <Ionicons name="document-text-outline" size={20} color={colors.gold} />
        <Text style={styles.linkText}>Terms of service</Text>
        <Ionicons name="open-outline" size={16} color={colors.textMuted} />
      </Pressable>
      <Pressable style={styles.linkRow} onPress={() => open('https://cenaiva.app/privacy')}>
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.gold} />
        <Text style={styles.linkText}>Privacy policy</Text>
        <Ionicons name="open-outline" size={16} color={colors.textMuted} />
      </Pressable>
      <Pressable style={styles.linkRow} onPress={() => open('https://cenaiva.app/ack')}>
        <Ionicons name="heart-outline" size={20} color={colors.gold} />
        <Text style={styles.linkText}>Acknowledgements</Text>
        <Ionicons name="open-outline" size={16} color={colors.textMuted} />
      </Pressable>

      <Card style={styles.contactCard}>
        <Text style={styles.contactLabel}>Contact</Text>
        <Text style={styles.contactEmail}>hello@cenaiva.app</Text>
        <Text style={styles.contactHint}>For partnerships and press inquiries</Text>
      </Card>
    </ProfileStackScreen>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 4,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  version: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  aboutCard: {
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  aboutText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  linkText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  contactCard: {
    marginTop: spacing.lg,
    ...shadows.card,
  },
  contactLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  contactEmail: {
    ...typography.bodyLarge,
    color: colors.gold,
    fontWeight: '700',
  },
  contactHint: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
