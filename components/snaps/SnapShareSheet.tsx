import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/lib/theme';
import { shareSnapToSocial } from '@/lib/sharing/generateShareCard';

interface SnapShareSheetProps {
  imageUrl: string;
  restaurantName: string;
  rating?: number;
}

export function SnapShareSheet({ imageUrl, restaurantName, rating }: SnapShareSheetProps) {
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      await shareSnapToSocial(imageUrl, restaurantName, rating);
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="share-social-outline" size={20} color={colors.gold} />
        <Text style={styles.heading}>Share your snap</Text>
      </View>

      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.preview} resizeMode="cover" />
      ) : null}

      <Text style={styles.hint}>
        Share to Instagram, TikTok, iMessage & more — with Cenaiva branding so your friends can discover the restaurant too.
      </Text>

      <Pressable
        onPress={handleShare}
        disabled={sharing}
        style={({ pressed }) => [styles.shareBtn, (pressed || sharing) && styles.shareBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Share snap to social media"
      >
        {sharing ? (
          <ActivityIndicator size="small" color={colors.bgBase} />
        ) : (
          <>
            <Ionicons name="logo-instagram" size={18} color={colors.bgBase} style={styles.btnIcon} />
            <Text style={styles.shareBtnLabel}>Share to Instagram, TikTok & more</Text>
          </>
        )}
      </Pressable>
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
    gap: spacing.md,
    width: '100%',
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heading: {
    ...typography.label,
    color: colors.gold,
    fontWeight: '700',
  },
  preview: {
    width: '100%',
    height: 160,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgBase,
  },
  hint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    minHeight: 48,
  },
  shareBtnPressed: {
    opacity: 0.82,
  },
  btnIcon: {
    marginRight: 2,
  },
  shareBtnLabel: {
    ...typography.body,
    color: colors.bgBase,
    fontWeight: '700',
  },
});
