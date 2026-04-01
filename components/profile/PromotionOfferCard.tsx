import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Badge } from '@/components/ui';
import type { PromotionOffer } from '@/lib/mock/profileScreens';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/theme';

type Props = {
  offer: PromotionOffer;
};

export function PromotionOfferCard({ offer }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.headline}>{offer.headline}</Text>
        {offer.badge ? <Badge label={offer.badge} variant="gold" size="sm" /> : <View style={styles.spacer} />}
      </View>
      <Text style={styles.description}>{offer.description}</Text>
      <Text style={styles.expires}>{offer.expiresLabel}</Text>
      <View style={styles.termsBox}>
        <Text style={styles.terms}>{offer.terms}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.25)',
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  headline: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  spacer: {
    width: 1,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  expires: {
    ...typography.bodySmall,
    color: colors.gold,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  termsBox: {
    backgroundColor: colors.bgElevated,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  terms: {
    ...typography.bodySmall,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
