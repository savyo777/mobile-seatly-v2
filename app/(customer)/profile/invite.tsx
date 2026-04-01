import React from 'react';
import { View, Text, StyleSheet, Pressable, Share } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { Card, Button, Badge } from '@/components/ui';
import { mockInviteRecords, REFERRAL_CODE, REFERRAL_THEY_GET, REFERRAL_YOU_GET } from '@/lib/mock/profileScreens';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/theme';

export default function InviteScreen() {
  const { t } = useTranslation();

  const share = async () => {
    await Share.share({
      message: `Join me on Seatly — book incredible tables and earn rewards. Use my code ${REFERRAL_CODE} when you sign up.`,
      title: 'Seatly referral',
    });
  };

  return (
    <ProfileStackScreen title={t('profile.inviteFriends')}>
      <Card style={{ ...styles.hero, ...shadows.goldGlow }}>
        <Text style={styles.heroTitle}>Invite friends and earn dining credits</Text>
        <Text style={styles.heroBody}>
          When a friend completes their first eligible booking, you both unlock Seatly credits toward your next experience.
        </Text>
        <View style={styles.rewardPills}>
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>You get</Text>
            <Text style={styles.pillValue}>${REFERRAL_YOU_GET}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>They get</Text>
            <Text style={styles.pillValue}>${REFERRAL_THEY_GET}</Text>
          </View>
        </View>
      </Card>

      <Text style={styles.codeLabel}>Your referral code</Text>
      <Pressable style={styles.codeBox} onPress={share}>
        <Text style={styles.codeText}>{REFERRAL_CODE}</Text>
        <Ionicons name="share-outline" size={22} color={colors.gold} />
      </Pressable>
      <Button title="Share invite link" onPress={share} variant="primary" size="md" style={styles.shareBtn} />

      <Text style={styles.sectionTitle}>Recent invites</Text>
      {mockInviteRecords.map((inv) => (
        <Card key={inv.id} style={styles.invRow} padded>
          <View style={styles.invTop}>
            <View>
              <Text style={styles.invName}>{inv.name}</Text>
              <Text style={styles.invEmail}>{inv.email}</Text>
            </View>
            <Badge label={inv.status} variant={inv.status === 'Joined' ? 'gold' : 'muted'} size="sm" />
          </View>
          <Text style={styles.invDate}>{inv.dateLabel}</Text>
          {inv.youEarned != null ? (
            <Text style={styles.invEarned}>You earned ${inv.youEarned} credit</Text>
          ) : null}
        </Card>
      ))}
    </ProfileStackScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: spacing.xl,
    borderColor: 'rgba(201, 168, 76, 0.35)',
  },
  heroTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  heroBody: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  rewardPills: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pill: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillLabel: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: 4,
  },
  pillValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.gold,
  },
  codeLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.4)',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  codeText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 2,
  },
  shareBtn: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    fontWeight: '700',
  },
  invRow: {
    marginBottom: spacing.md,
    ...shadows.card,
  },
  invTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  invName: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  invEmail: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 2,
  },
  invDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  invEarned: {
    ...typography.bodySmall,
    color: colors.gold,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
});
