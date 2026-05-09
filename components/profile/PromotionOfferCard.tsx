import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@/components/ui';
import type { PromotionOffer } from '@/lib/mock/profileScreens';
import {
  claimPromotion,
  isPromotionClaimed,
  unclaimPromotion,
} from '@/lib/storage/claimedPromotions';
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
  cardClaimed: {
    borderColor: c.gold,
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
    marginBottom: spacing.md,
  },
  terms: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 18,
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    backgroundColor: c.gold,
  },
  claimBtnText: {
    ...typography.body,
    color: c.bgBase,
    fontWeight: '700',
  },
  claimedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(201, 168, 76, 0.14)',
    borderWidth: 1,
    borderColor: c.gold,
  },
  claimedBtnText: {
    ...typography.body,
    color: c.gold,
    fontWeight: '700',
  },
  removeLink: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  removeLinkText: {
    ...typography.bodySmall,
    color: c.textMuted,
    textDecorationLine: 'underline',
  },
}));

export function PromotionOfferCard({ offer }: Props) {
  const styles = useStyles();
  const c = useColors();
  const [claimed, setClaimed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isPromotionClaimed(offer.id).then((value) => {
      if (!cancelled) {
        setClaimed(value);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [offer.id]);

  const onClaim = async () => {
    if (working) return;
    setWorking(true);
    try {
      await claimPromotion(offer.id);
      setClaimed(true);
    } finally {
      setWorking(false);
    }
  };

  const onRemove = async () => {
    if (working) return;
    setWorking(true);
    try {
      await unclaimPromotion(offer.id);
      setClaimed(false);
    } finally {
      setWorking(false);
    }
  };

  return (
    <View style={[styles.card, claimed && styles.cardClaimed]}>
      <View style={styles.top}>
        <Text style={styles.headline}>{offer.headline}</Text>
        {claimed ? (
          <Badge label="Claimed" variant="gold" size="sm" />
        ) : offer.badge ? (
          <Badge label={offer.badge} variant="gold" size="sm" />
        ) : (
          <View style={styles.spacer} />
        )}
      </View>
      <Text style={styles.description}>{offer.description}</Text>
      <Text style={styles.expires}>{offer.expiresLabel}</Text>
      <View style={styles.termsBox}>
        <Text style={styles.terms}>{offer.terms}</Text>
      </View>
      {loading ? (
        <View style={styles.claimBtn}>
          <ActivityIndicator color={c.bgBase} />
        </View>
      ) : claimed ? (
        <>
          <View style={styles.claimedBtn}>
            <Ionicons name="checkmark-circle" size={18} color={c.gold} />
            <Text style={styles.claimedBtnText}>Ready to use at checkout</Text>
          </View>
          <Pressable
            onPress={onRemove}
            disabled={working}
            style={({ pressed }) => [styles.removeLink, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Remove this promotion"
          >
            <Text style={styles.removeLinkText}>Remove from claimed</Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          onPress={onClaim}
          disabled={working}
          style={({ pressed }) => [styles.claimBtn, pressed && { opacity: 0.85 }, working && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={`Claim ${offer.headline}`}
        >
          {working ? (
            <ActivityIndicator color={c.bgBase} />
          ) : (
            <Ionicons name="ticket-outline" size={18} color={c.bgBase} />
          )}
          <Text style={styles.claimBtnText}>Claim offer</Text>
        </Pressable>
      )}
    </View>
  );
}
