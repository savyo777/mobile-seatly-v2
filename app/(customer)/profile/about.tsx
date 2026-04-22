import React from 'react';
import { View, Text, StyleSheet, Linking, Pressable } from 'react-native';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { Card } from '@/components/ui';
import { useColors, createStyles, spacing, typography, borderRadius, shadows } from '@/lib/theme';

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
        <Ionicons name="document-text-outline" size={20} color={c.gold} />
        <Text style={styles.linkText}>Terms of service</Text>
        <Ionicons name="open-outline" size={16} color={c.textMuted} />
      </Pressable>
      <Pressable style={styles.linkRow} onPress={() => open('https://cenaiva.app/privacy')}>
        <Ionicons name="shield-checkmark-outline" size={20} color={c.gold} />
        <Text style={styles.linkText}>Privacy policy</Text>
        <Ionicons name="open-outline" size={16} color={c.textMuted} />
      </Pressable>
      <Pressable style={styles.linkRow} onPress={() => open('https://cenaiva.app/ack')}>
        <Ionicons name="heart-outline" size={20} color={c.gold} />
        <Text style={styles.linkText}>Acknowledgements</Text>
        <Ionicons name="open-outline" size={16} color={c.textMuted} />
      </Pressable>

      <Card style={styles.contactCard}>
        <Text style={styles.contactLabel}>Contact</Text>
        <Text style={styles.contactEmail}>hello@cenaiva.app</Text>
        <Text style={styles.contactHint}>For partnerships and press inquiries</Text>
      </Card>
    </ProfileStackScreen>
  );
}
