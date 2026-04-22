import React from 'react';
import { View, Text } from 'react-native';
import { Badge } from '@/components/ui';
import type { PromotionOffer } from '@/lib/mock/profileScreens';
import { useColors, createStyles, spacing, typography, borderRadius, shadows } from '@/lib/theme';

type Props = {
  offer: PromotionOffer;
};

const useStyles = createStyles((c) => ({
  card: {
    backgroundColor: c.bgSurface,
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
    color: c.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  spacer: {
    width: 1,
  },
  description: {
    ...typography.body,
    color: c.textSecondary,
    marginBottom: spacing.sm,
  },
  expires: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  termsBox: {
    backgroundColor: c.bgElevated,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: c.border,
  },
  terms: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 18,
  },
}));

export function PromotionOfferCard({ offer }: Props) {
  const styles = useStyles();

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
