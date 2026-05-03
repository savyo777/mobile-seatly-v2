import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, createStyles, shadows, spacing, typography, useColors } from '@/lib/theme';
import {
  openUserSocialApp,
  type UserSocialPlatform,
} from '@/lib/config/cenaivaSocial';

interface SnapShareSheetProps {
  imageUrl: string;
}

const SOCIAL_ICON: Record<UserSocialPlatform, keyof typeof Ionicons.glyphMap> = {
  instagram: 'logo-instagram',
  tiktok: 'logo-tiktok',
  youtube: 'logo-youtube',
  snapchat: 'chatbubble-ellipses-outline',
};

const SOCIAL_LABEL: Record<UserSocialPlatform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  snapchat: 'Snapchat',
};

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
    height: 340,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgBase,
    overflow: 'hidden',
  },
  previewBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  previewBackdropShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
  },
  hint: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 18,
  },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  socialChip: {
    width: '48%',
    flexGrow: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: c.bgBase,
    borderWidth: 1,
    borderColor: c.border,
  },
  socialChipPressed: {
    opacity: 0.82,
  },
  socialChipLabel: {
    ...typography.bodySmall,
    color: c.textPrimary,
    fontWeight: '600',
  },
}));

const SOCIAL_ORDER: UserSocialPlatform[] = ['instagram', 'snapchat', 'youtube', 'tiktok'];

/**
 * Direct-link buttons: open the user's own app (if installed) so they can post fast while logged in.
 * Image preview keeps the full snap visible while using a blurred backdrop instead of black side bars.
 */
export function SnapShareSheet({ imageUrl }: SnapShareSheetProps) {
  const c = useColors();
  const styles = useStyles();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="share-social-outline" size={20} color={c.gold} />
        <Text style={styles.heading}>Share your snap</Text>
      </View>

      {imageUrl ? (
        <View style={styles.preview}>
          <Image source={{ uri: imageUrl }} style={styles.previewBackdrop} contentFit="cover" blurRadius={24} />
          <View style={styles.previewBackdropShade} />
          <Image source={{ uri: imageUrl }} style={styles.previewImage} contentFit="contain" />
        </View>
      ) : null}

      <Text style={styles.hint}>
        Jump straight into your apps to post this moment — you’re already logged in there. If an app isn’t installed,
        we’ll open the website instead.
      </Text>

      <View style={styles.socialGrid}>
        {SOCIAL_ORDER.map((platform) => (
          <Pressable
            key={platform}
            onPress={() => void openUserSocialApp(platform)}
            style={({ pressed }) => [styles.socialChip, pressed && styles.socialChipPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Open ${SOCIAL_LABEL[platform]} to post`}
          >
            <Ionicons name={SOCIAL_ICON[platform]} size={20} color={c.gold} />
            <Text style={styles.socialChipLabel}>{SOCIAL_LABEL[platform]}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
