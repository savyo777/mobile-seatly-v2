import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, createStyles, shadows, spacing, typography, useColors } from '@/lib/theme';
import { shareSnapToSocial } from '@/lib/sharing/generateShareCard';

interface SnapShareSheetProps {
  imageUrl: string;
  restaurantName: string;
  rating?: number;
}

const useStyles = createStyles((c) => ({
  card: {
    backgroundColor: c.bgSurface,
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
    color: c.gold,
    fontWeight: '700',
  },
  preview: {
    width: '100%',
    height: 160,
    borderRadius: borderRadius.md,
    backgroundColor: c.bgBase,
  },
  hint: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 18,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.gold,
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
    color: c.bgBase,
    fontWeight: '700',
  },
}));

export function SnapShareSheet({ imageUrl, restaurantName, rating }: SnapShareSheetProps) {
  const c = useColors();
  const styles = useStyles();
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
        <Ionicons name="share-social-outline" size={20} color={c.gold} />
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
          <ActivityIndicator size="small" color={c.bgBase} />
        ) : (
          <>
            <Ionicons name="logo-instagram" size={18} color={c.bgBase} style={styles.btnIcon} />
            <Text style={styles.shareBtnLabel}>Share to Instagram, TikTok & more</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
