import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, createStyles, shadows, spacing, typography, useColors } from '@/lib/theme';
import {
  exportFilteredMedia,
  getMimeType,
} from '@/lib/sharing/mediaExport';
import { getMediaTypeFromMime, type SocialMediaType } from '@/lib/sharing/mime';
import {
  shareToInstagramFeed,
  shareToInstagramStory,
  shareToYouTube,
  isNativeSocialShareAvailable,
  type SocialShareDestination,
} from '@/lib/sharing/nativeSocialShare';
import { openPersonalSnapchatApp, openPersonalTikTokApp } from '@/lib/sharing/personalSocialApp';

interface SnapShareSheetProps {
  imageUrl: string;
  mediaType?: SocialMediaType;
}

type ShareOption = {
  destination: SocialShareDestination;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  videoOnly?: boolean;
  /** Opens the user's Snapchat or TikTok app (logged-in session on device). */
  personalSocial?: boolean;
};

const SHARE_OPTIONS: ShareOption[] = [
  { destination: 'instagram-story', label: 'Instagram Story', icon: 'logo-instagram' },
  { destination: 'instagram-feed', label: 'Instagram Feed', icon: 'logo-instagram' },
  { destination: 'snapchat-story', label: 'Snapchat', icon: 'chatbubble-ellipses-outline', personalSocial: true },
  { destination: 'tiktok', label: 'TikTok', icon: 'logo-tiktok', personalSocial: true },
  { destination: 'youtube', label: 'YouTube', icon: 'logo-youtube', videoOnly: true },
];

const DESTINATION_LABEL: Record<SocialShareDestination, string> = {
  'instagram-story': 'Instagram Story',
  'instagram-feed': 'Instagram Feed',
  tiktok: 'TikTok',
  'snapchat-story': 'Snapchat',
  youtube: 'YouTube',
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
  socialChipDisabled: {
    opacity: 0.48,
  },
  socialChipLabel: {
    ...typography.bodySmall,
    color: c.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusText: {
    ...typography.bodySmall,
    color: c.textSecondary,
  },
}));

export function SnapShareSheet({ imageUrl, mediaType }: SnapShareSheetProps) {
  const c = useColors();
  const styles = useStyles();
  const [pendingDestination, setPendingDestination] = useState<SocialShareDestination | null>(null);
  const [localMediaUri, setLocalMediaUri] = useState<string | null>(null);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [isPreparingMedia, setIsPreparingMedia] = useState(false);
  const nativeShareAvailable = isNativeSocialShareAvailable();
  const resolvedMediaType = useMemo(() => {
    if (mediaType) return mediaType;
    return getMediaTypeFromMime(getMimeType(imageUrl));
  }, [imageUrl, mediaType]);
  const visibleOptions = useMemo(
    () => SHARE_OPTIONS.filter((option) => !option.videoOnly || resolvedMediaType === 'video'),
    [resolvedMediaType],
  );

  useEffect(() => {
    let cancelled = false;

    setLocalMediaUri(null);
    setPrepareError(null);
    setPendingDestination(null);

    if (!imageUrl) return;

    setIsPreparingMedia(true);
    exportFilteredMedia(imageUrl, resolvedMediaType)
      .then((uri) => {
        if (!cancelled) {
          setLocalMediaUri(uri);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'The filtered snap could not be prepared for sharing.';
          setPrepareError(message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsPreparingMedia(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [imageUrl, resolvedMediaType]);

  const handleShare = async (destination: SocialShareDestination, personalSocial?: boolean) => {
    if (pendingDestination) return;

    if (personalSocial) {
      setPendingDestination(destination);
      try {
        if (destination === 'tiktok') {
          await openPersonalTikTokApp();
        } else {
          await openPersonalSnapchatApp();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Something went wrong.';
        Alert.alert(DESTINATION_LABEL[destination], message);
      } finally {
        setPendingDestination(null);
      }
      return;
    }

    if (!localMediaUri) {
      Alert.alert('Snap not ready', prepareError ?? 'Cenaiva is still preparing this image for sharing.');
      return;
    }

    if (!nativeShareAvailable) {
      Alert.alert(
        'Update Cenaiva',
        'This app build does not include native Instagram or YouTube sharing yet. Reinstall the latest dev build, then reopen this snap.',
      );
      return;
    }

    setPendingDestination(destination);
    try {
      switch (destination) {
        case 'instagram-story':
          await shareToInstagramStory(localMediaUri, resolvedMediaType);
          break;
        case 'instagram-feed':
          await shareToInstagramFeed(localMediaUri, resolvedMediaType);
          break;
        case 'youtube':
          await shareToYouTube(localMediaUri);
          break;
        default:
          break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The media could not be shared.';
      Alert.alert(`${DESTINATION_LABEL[destination]} unavailable`, message);
    } finally {
      setPendingDestination(null);
    }
  };

  const showPrepareStatus =
    isPreparingMedia ||
    prepareError ||
    (!nativeShareAvailable && visibleOptions.some((o) => !o.personalSocial));

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
        Your moment is worth sharing. Pick where you would like to take it next — we are cheering you on.
      </Text>
      {showPrepareStatus ? (
        <Text style={styles.statusText}>
          {!nativeShareAvailable && !isPreparingMedia && !prepareError
            ? 'Direct sharing to Instagram or YouTube from this screen requires a build that includes the native sharing module.'
            : prepareError ?? (isPreparingMedia ? 'Preparing your snap for sharing…' : '')}
        </Text>
      ) : null}

      <View style={styles.socialGrid}>
        {visibleOptions.map((option) => {
          const isPending = pendingDestination === option.destination;
          const personal = Boolean(option.personalSocial);
          const disabled = pendingDestination !== null || (!personal && (!nativeShareAvailable || !localMediaUri));

          return (
            <Pressable
              key={option.destination}
              onPress={() => void handleShare(option.destination, option.personalSocial)}
              disabled={disabled}
              style={({ pressed }) => [
                styles.socialChip,
                pressed && styles.socialChipPressed,
                disabled && styles.socialChipDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                personal ? `Open your ${option.label} app` : `Share snap to ${option.label}`
              }
            >
              {isPending ? (
                <ActivityIndicator size="small" color={c.gold} />
              ) : (
                <Ionicons name={option.icon} size={20} color={c.gold} />
              )}
              <Text style={styles.socialChipLabel}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
