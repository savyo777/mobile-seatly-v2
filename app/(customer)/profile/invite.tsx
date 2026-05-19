import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, Share, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { Card, Button, Badge } from '@/components/ui';
import {
  mockInviteRecords as DEMO_INVITE_RECORDS,
  REFERRAL_CODE,
  REFERRAL_THEY_GET,
  REFERRAL_YOU_GET,
} from '@/lib/mock/profileScreens';
import { isDemoModeEnabled } from '@/lib/config/demoMode';

const mockInviteRecords: typeof DEMO_INVITE_RECORDS = isDemoModeEnabled() ? DEMO_INVITE_RECORDS : [];
import {
  canShareReferral,
  getReferralLimits,
  recordReferralShare,
  REFERRAL_DAILY_SHARE_LIMIT,
  REFERRAL_LIFETIME_CREDIT_CAP,
  type ReferralLimitsSnapshot,
} from '@/lib/storage/referralLimits';
import { useColors, createStyles, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { friendlyError } from '@/lib/errors/friendlyError';

const useStyles = createStyles((c) => ({
  hero: {
    marginBottom: spacing.xl,
    borderColor: 'rgba(201, 168, 76, 0.35)',
  },
  heroTitle: {
    ...typography.h3,
    color: c.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  heroBody: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  rewardPills: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pill: {
    flex: 1,
    backgroundColor: c.bgElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  pillLabel: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginBottom: 4,
  },
  pillValue: {
    fontSize: 22,
    fontWeight: '800',
    color: c.gold,
  },
  codeLabel: {
    ...typography.label,
    color: c.textMuted,
    marginBottom: spacing.sm,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.bgSurface,
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
    color: c.gold,
    letterSpacing: 2,
  },
  shareBtn: {
    marginBottom: spacing.md,
  },
  limitsCard: {
    marginBottom: spacing['2xl'],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    gap: spacing.sm,
  },
  limitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  limitsLabel: {
    ...typography.bodySmall,
    color: c.textMuted,
  },
  limitsValue: {
    ...typography.bodySmall,
    color: c.textPrimary,
    fontWeight: '700',
  },
  limitsValueWarn: {
    color: '#EF4444',
  },
  limitsHint: {
    ...typography.bodySmall,
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 16,
    marginTop: 4,
  },
  sectionTitle: {
    ...typography.h3,
    color: c.textPrimary,
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
    color: c.textPrimary,
    fontWeight: '700',
  },
  invEmail: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: 2,
  },
  invDate: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginTop: spacing.sm,
  },
  invEarned: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
}));

export default function InviteScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const [limits, setLimits] = useState<ReferralLimitsSnapshot | null>(null);

  const refresh = useCallback(async () => {
    const snapshot = await getReferralLimits();
    setLimits(snapshot);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Tick the cooldown timer down so the button re-enables once the cooldown
  // elapses. Stops ticking once cooldown hits zero.
  useEffect(() => {
    if (!limits || limits.cooldownSecondsRemaining <= 0) return;
    const interval = setInterval(() => {
      void refresh();
    }, 1000);
    return () => clearInterval(interval);
  }, [limits, refresh]);

  const share = async () => {
    const gate = await canShareReferral();
    if (!gate.allowed) {
      if (gate.reason === 'daily_limit') {
        Alert.alert(
          'Daily share limit reached',
          friendlyError(undefined, `You can share your code up to ${REFERRAL_DAILY_SHARE_LIMIT} times per day. Try again tomorrow.`),
        );
      } else if (gate.reason === 'cooldown') {
        Alert.alert(
          'Slow down a moment',
          friendlyError(undefined, `Wait ${gate.retryInSeconds ?? 0}s before sharing again.`),
        );
      } else if (gate.reason === 'cap_reached') {
        Alert.alert(
          'Lifetime credit cap reached',
          friendlyError(undefined, `You've earned the maximum $${REFERRAL_LIFETIME_CREDIT_CAP} in referral credits. Thanks for spreading the word!`),
        );
      }
      return;
    }
    try {
      const result = await Share.share({
        message: `Join me on Cenaiva — book incredible tables and earn rewards. Use my code ${REFERRAL_CODE} when you sign up.`,
        title: 'Cenaiva referral',
      });
      if (result.action !== Share.dismissedAction) {
        await recordReferralShare();
        await refresh();
      }
    } catch (error) {
      Alert.alert('Could not share', friendlyError(error, 'Please try again.'));
    }
  };

  const cooldown = limits?.cooldownSecondsRemaining ?? 0;
  const sharesRemaining = limits?.sharesRemainingToday ?? REFERRAL_DAILY_SHARE_LIMIT;
  const lifetimeEarned = limits?.lifetimeCreditEarned ?? 0;
  const lifetimeCap = limits?.lifetimeCreditCap ?? REFERRAL_LIFETIME_CREDIT_CAP;
  const capReached = lifetimeEarned >= lifetimeCap;
  const shareDisabled = cooldown > 0 || sharesRemaining <= 0 || capReached;
  const shareLabel =
    cooldown > 0
      ? `Wait ${cooldown}s`
      : sharesRemaining <= 0
        ? 'Daily limit reached'
        : capReached
          ? 'Lifetime cap reached'
          : 'Share invite link';

  return (
    <ProfileStackScreen title="Refer & Earn">
      <Card style={{ ...styles.hero, ...shadows.goldGlow }}>
        <Text style={styles.heroTitle}>Invite friends and earn dining credits</Text>
        <Text style={styles.heroBody}>
          When a friend completes their first eligible booking, you both unlock Cenaiva credits toward your next experience. Lifetime credit is capped at ${lifetimeCap} per account.
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
      <Pressable style={styles.codeBox} onPress={share} disabled={shareDisabled}>
        <Text style={styles.codeText}>{REFERRAL_CODE}</Text>
        <Ionicons name="share-outline" size={22} color={c.gold} />
      </Pressable>
      <Button
        title={shareLabel}
        onPress={share}
        variant="primary"
        size="md"
        style={styles.shareBtn}
        disabled={shareDisabled}
      />

      <View style={styles.limitsCard}>
        <View style={styles.limitsRow}>
          <Text style={styles.limitsLabel}>Shares remaining today</Text>
          <Text style={[styles.limitsValue, sharesRemaining <= 1 && styles.limitsValueWarn]}>
            {sharesRemaining} / {REFERRAL_DAILY_SHARE_LIMIT}
          </Text>
        </View>
        <View style={styles.limitsRow}>
          <Text style={styles.limitsLabel}>Lifetime credit earned</Text>
          <Text style={[styles.limitsValue, capReached && styles.limitsValueWarn]}>
            ${lifetimeEarned} / ${lifetimeCap}
          </Text>
        </View>
        <Text style={styles.limitsHint}>
          To prevent abuse, you can share your code up to {REFERRAL_DAILY_SHARE_LIMIT} times per day with a short cooldown between shares.
        </Text>
      </View>

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
