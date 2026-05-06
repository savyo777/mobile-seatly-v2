import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import type { ImageLoadEventData } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, createStyles, shadows, spacing, typography, useColors } from '@/lib/theme';
import { StoryFilterFrame } from '@/components/storyFilters/StoryFilterFrame';
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
import { captureStyledSnapToTmpFile } from '@/lib/snapOverlays/captureStyledSnap';
import { saveMediaToCameraRoll } from '@/lib/storage/cameraRoll';
import {
  DEFAULT_SNAP_PHOTO_ASPECT,
  getSnapPreviewLayout,
} from '@/lib/storyFilters/previewLayout';
import type { StoryFilterId } from '@/lib/storyFilters/types';

interface SnapShareSheetProps {
  imageUrl: string;
  mediaType?: SocialMediaType;
  storyFilterId?: StoryFilterId | null;
  storyFilterCapturedAt?: number;
  restaurantName?: string;
  city?: string;
  area?: string;
  autoSaveToCameraRoll?: boolean;
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
    alignSelf: 'center',
    borderRadius: borderRadius.lg,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
  },
  hint: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
  },
  saveButton: {
    width: '100%',
    minHeight: 46,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: c.gold,
    backgroundColor: 'rgba(201,168,76,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  saveButtonPressed: {
    opacity: 0.86,
  },
  saveButtonDisabled: {
    opacity: 0.62,
  },
  saveButtonText: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '800',
    textAlign: 'center',
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

export function SnapShareSheet({
  imageUrl,
  mediaType,
  storyFilterId,
  storyFilterCapturedAt,
  restaurantName,
  city,
  area,
  autoSaveToCameraRoll = false,
}: SnapShareSheetProps) {
  const c = useColors();
  const styles = useStyles();
  const { width: windowW, height: windowH } = useWindowDimensions();
  const storyFrameRef = useRef<View | null>(null);
  const autoSaveAttemptedRef = useRef(false);
  const [pendingDestination, setPendingDestination] = useState<SocialShareDestination | null>(null);
  const [localMediaUri, setLocalMediaUri] = useState<string | null>(null);
  const [localMediaIncludesStoryFilter, setLocalMediaIncludesStoryFilter] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [isPreparingMedia, setIsPreparingMedia] = useState(false);
  const [isSavingToCameraRoll, setIsSavingToCameraRoll] = useState(false);
  const [cameraRollSaved, setCameraRollSaved] = useState(false);
  const [cameraRollSavedOriginalFallback, setCameraRollSavedOriginalFallback] = useState(false);
  const [cameraRollError, setCameraRollError] = useState<string | null>(null);
  const [loadedPreviewKey, setLoadedPreviewKey] = useState<string | null>(null);
  const [photoAspect, setPhotoAspect] = useState(DEFAULT_SNAP_PHOTO_ASPECT);
  const nativeShareAvailable = isNativeSocialShareAvailable();
  const resolvedMediaType = useMemo(() => {
    if (mediaType) return mediaType;
    return getMediaTypeFromMime(getMimeType(imageUrl));
  }, [imageUrl, mediaType]);
  const hasStoryFilter = resolvedMediaType === 'photo' && !!storyFilterId;
  const previewReady = loadedPreviewKey === imageUrl;
  const previewLayout = getSnapPreviewLayout({
    photoAspect,
    maxWidth: Math.min(windowW - spacing.lg * 4, 340),
    maxHeight: Math.max(300, Math.min(380, windowH * 0.44)),
  });
  const previewW = previewLayout.width;
  const previewH = previewLayout.height;
  const visibleOptions = useMemo(
    () => SHARE_OPTIONS.filter((option) => !option.videoOnly || resolvedMediaType === 'video'),
    [resolvedMediaType],
  );

  useEffect(() => {
    setLocalMediaUri(null);
    setLocalMediaIncludesStoryFilter(false);
    setCameraRollSaved(false);
    setCameraRollSavedOriginalFallback(false);
    setCameraRollError(null);
    autoSaveAttemptedRef.current = false;
  }, [imageUrl, storyFilterId]);

  const handlePhotoLoad = useCallback((event: ImageLoadEventData) => {
    const { width, height } = event.source ?? {};
    if (width > 0 && height > 0) {
      setPhotoAspect(width / height);
    }
    setLoadedPreviewKey(imageUrl);
  }, [imageUrl]);

  const prepareSnapMedia = useCallback(async (options?: { requireStoryFilter?: boolean }) => {
    const requireStoryFilter = options?.requireStoryFilter && hasStoryFilter;
    if (localMediaUri && (!requireStoryFilter || localMediaIncludesStoryFilter)) {
      return localMediaUri;
    }

    let uri: string | undefined;
    if (hasStoryFilter) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      uri = await captureStyledSnapToTmpFile(storyFrameRef);
      if (uri) {
        setLocalMediaUri(uri);
        setLocalMediaIncludesStoryFilter(true);
        return uri;
      }
      if (requireStoryFilter) return null;
    }

    const preparedUri = await exportFilteredMedia(imageUrl, resolvedMediaType);
    setLocalMediaUri(preparedUri);
    setLocalMediaIncludesStoryFilter(false);
    return preparedUri;
  }, [
    hasStoryFilter,
    imageUrl,
    localMediaIncludesStoryFilter,
    localMediaUri,
    resolvedMediaType,
  ]);

  const saveCurrentSnapToCameraRoll = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = Boolean(options?.silent);

      if (cameraRollSaved) {
        if (!silent) {
          Alert.alert('Saved', 'Your snap is already in your camera roll.');
        }
        return;
      }

      if (isSavingToCameraRoll) return;

      if (hasStoryFilter && !previewReady) {
        if (!silent) {
          Alert.alert('Almost ready', 'Give the filter one second to finish loading, then save it.');
        }
        return;
      }

      setIsSavingToCameraRoll(true);
      setCameraRollError(null);

      try {
        let savedOriginalFallback = false;
        let uri = await prepareSnapMedia({ requireStoryFilter: hasStoryFilter });
        if (!uri && hasStoryFilter) {
          uri = await prepareSnapMedia();
          savedOriginalFallback = Boolean(uri);
        }
        if (!uri) {
          const message = 'Cenaiva could not prepare this photo for saving.';
          if (!silent) {
            setCameraRollError(message);
            Alert.alert('Save unavailable', message);
          }
          return;
        }

        const saved = await saveMediaToCameraRoll(uri);
        if (!saved) {
          const message =
            'Cenaiva could not save this snap. Allow photo access for Cenaiva, then try again.';
          if (!silent) {
            setCameraRollError(message);
            Alert.alert('Save unavailable', message);
          }
          return;
        }

        setCameraRollSaved(true);
        setCameraRollSavedOriginalFallback(savedOriginalFallback);
        if (!silent) {
          Alert.alert(
            'Saved',
            savedOriginalFallback
              ? 'Your photo was saved to your camera roll. Saving the filter on top requires the Cenaiva development build.'
              : 'Your snap was saved to your camera roll.',
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'This snap could not be saved.';
        if (!silent) {
          setCameraRollError(message);
          Alert.alert('Save unavailable', message);
        }
      } finally {
        setIsSavingToCameraRoll(false);
      }
    },
    [
      cameraRollSaved,
      hasStoryFilter,
      isSavingToCameraRoll,
      prepareSnapMedia,
      previewReady,
    ],
  );

  useEffect(() => {
    if (!autoSaveToCameraRoll || !imageUrl || resolvedMediaType !== 'photo') return;
    if (autoSaveAttemptedRef.current) return;
    if (hasStoryFilter && !previewReady) return;

    const timeout = setTimeout(() => {
      autoSaveAttemptedRef.current = true;
      void saveCurrentSnapToCameraRoll({ silent: true });
    }, hasStoryFilter ? 250 : 0);

    return () => {
      clearTimeout(timeout);
    };
  }, [
    autoSaveToCameraRoll,
    hasStoryFilter,
    imageUrl,
    previewReady,
    resolvedMediaType,
    saveCurrentSnapToCameraRoll,
  ]);

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

    if (!nativeShareAvailable) {
      Alert.alert(
        'Update Cenaiva',
        'This app build does not include native Instagram or YouTube sharing yet. Reinstall the latest dev build, then reopen this snap.',
      );
      return;
    }

    setPendingDestination(destination);
    try {
      let uri = localMediaUri;
      if (!uri) {
        setIsPreparingMedia(true);
        setPrepareError(null);
        try {
          uri = await prepareSnapMedia();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'This image could not be prepared for sharing.';
          setPrepareError(message);
          Alert.alert('Share unavailable', message);
          return;
        } finally {
          setIsPreparingMedia(false);
        }
      }

      if (!uri) return;

      switch (destination) {
        case 'instagram-story':
          await shareToInstagramStory(uri, resolvedMediaType);
          break;
        case 'instagram-feed':
          await shareToInstagramFeed(uri, resolvedMediaType);
          break;
        case 'youtube':
          await shareToYouTube(uri);
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
    !!cameraRollError ||
    !!prepareError ||
    (!nativeShareAvailable && visibleOptions.some((o) => !o.personalSocial));

  const saveDisabled = isSavingToCameraRoll || cameraRollSaved || (hasStoryFilter && !previewReady);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="share-social-outline" size={20} color={c.gold} />
        <Text style={styles.heading}>Share your snap</Text>
      </View>

      {imageUrl ? (
        <View style={[styles.preview, { width: previewW, height: previewH }]}>
          {hasStoryFilter ? (
            <View
              ref={storyFrameRef}
              collapsable={false}
              style={{ width: previewW, height: previewH }}
            >
              <StoryFilterFrame
                filterId={storyFilterId ?? null}
                width={previewW}
                height={previewH}
                capturedAt={storyFilterCapturedAt}
                restaurantName={restaurantName}
                city={city}
                area={area}
                mediaSlot={
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.previewImage}
                    contentFit="cover"
                    contentPosition="bottom"
                    onLoad={handlePhotoLoad}
                    onError={() => setLoadedPreviewKey(imageUrl)}
                  />
                }
              />
            </View>
          ) : (
            <Image
              source={{ uri: imageUrl }}
              style={styles.previewImage}
              contentFit="cover"
              contentPosition="bottom"
              onLoad={handlePhotoLoad}
              onError={() => setLoadedPreviewKey(imageUrl)}
            />
          )}
        </View>
      ) : null}

      <Text style={styles.hint}>
        Save it to your camera roll, then share the moment.
      </Text>
      <Pressable
        onPress={() => void saveCurrentSnapToCameraRoll()}
        disabled={saveDisabled}
        style={({ pressed }) => [
          styles.saveButton,
          pressed && styles.saveButtonPressed,
          saveDisabled && styles.saveButtonDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Save snap to your camera roll"
      >
        {isSavingToCameraRoll ? (
          <ActivityIndicator size="small" color={c.gold} />
        ) : (
          <Ionicons
            name={cameraRollSaved ? 'checkmark-circle-outline' : 'download-outline'}
            size={18}
            color={c.gold}
          />
        )}
        <Text style={styles.saveButtonText}>
          {cameraRollSaved
            ? cameraRollSavedOriginalFallback
              ? 'Saved photo to camera roll'
              : 'Saved to camera roll'
            : 'Save to your camera roll'}
        </Text>
      </Pressable>
      {showPrepareStatus ? (
        <Text style={styles.statusText}>
          {!nativeShareAvailable && !isPreparingMedia && !prepareError && !cameraRollError
            ? 'Direct sharing to Instagram or YouTube from this screen requires a build that includes the native sharing module.'
            : cameraRollError ??
              prepareError ??
              (isPreparingMedia ? 'Preparing image for Instagram or YouTube…' : '')}
        </Text>
      ) : null}

      <View style={styles.socialGrid}>
        {visibleOptions.map((option) => {
          const isPending = pendingDestination === option.destination;
          const personal = Boolean(option.personalSocial);
          const disabled =
            pendingDestination !== null ||
            (!personal && !nativeShareAvailable) ||
            (!personal && isPreparingMedia);

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
