import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import type { ImageLoadEventData } from 'expo-image';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Button } from '@/components/ui';
import { StoryFilterFrame } from '@/components/storyFilters/StoryFilterFrame';
import { useColors, createStyles, borderRadius, spacing, typography } from '@/lib/theme';
import { safeRouterBack } from '@/lib/navigation/transitions';
import { createSnapPost, getSnapRestaurantName } from '@/lib/mock/snaps';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { mockCustomer } from '@/lib/mock/users';
import { useCurrentUserId } from '@/lib/auth/currentUserId';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { uploadSnapPhoto } from '@/lib/snaps/uploadSnapPhoto';
import { insertVisitPhoto } from '@/lib/snaps/visitPhotosApi';
import { fetchCurrentUserProfile, type AppUserProfile } from '@/lib/services/userProfile';
import { insertRestaurantReview } from '@/lib/reviews/insertRestaurantReview';
import * as Crypto from 'expo-crypto';
import { STORY_FILTERS } from '@/lib/storyFilters/registry';
import {
  DEFAULT_SNAP_PHOTO_ASPECT,
  getSnapPreviewLayout,
} from '@/lib/storyFilters/previewLayout';
import type { StoryFilterId } from '@/lib/storyFilters/types';
import { normalizeTextInput, sanitizeTextInput } from '@/lib/validation/input';

const H_PAD = 18;

const useStyles = createStyles((c) => ({
  screen: {
    flex: 1,
    backgroundColor: c.bgBase,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    ...typography.h3,
    color: c.textPrimary,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  imageBlock: {
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgElevated,
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.bgElevated,
  },
  previewBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  previewBackdropShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  imageBottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 88,
  },
  imagePlaceholder: {
    width: '100%',
    minHeight: 240,
    alignSelf: 'center',
  },
  metaSection: {
    paddingHorizontal: H_PAD,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
  },
  identityText: {
    flex: 1,
  },
  username: {
    ...typography.body,
    color: c.goldLight,
    fontWeight: '700',
  },
  restaurantLine: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginTop: 2,
  },
  ratingRow: {
    gap: spacing.xs,
  },
  ratingLabel: {
    ...typography.bodySmall,
    color: c.textMuted,
    fontWeight: '600',
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  inputSection: {
    marginHorizontal: H_PAD,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  input: {
    minHeight: 120,
    ...typography.bodyLarge,
    color: c.textPrimary,
    textAlignVertical: 'top',
    padding: 0,
  },
  counter: {
    ...typography.bodySmall,
    color: c.textMuted,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  fieldSection: {
    marginHorizontal: H_PAD,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.label,
    color: c.textMuted,
  },
  lineInput: {
    flex: 1,
    ...typography.body,
    color: c.textPrimary,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  tagPoolRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
  },
  tagChipOn: {
    borderColor: c.gold,
    backgroundColor: 'rgba(201,168,76,0.14)',
  },
  tagChipText: {
    ...typography.bodySmall,
    color: c.textMuted,
    fontWeight: '600',
  },
  tagChipTextOn: {
    color: c.gold,
  },
  customTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: c.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.xs,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: c.gold,
  },
  selectedChipText: {
    ...typography.bodySmall,
    color: c.bgBase,
    fontWeight: '700',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: c.bgBase,
    paddingTop: spacing.md,
  },
}));

export default function SnapCaptionScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuthSession();
  const me = useCurrentUserId();
  const { width: windowW, height: windowH } = useWindowDimensions();
  const {
    photoUri,
    restaurantId,
    bookingId,
    filterId,
    capturedAt: capturedAtParam,
  } = useLocalSearchParams<{
    photoUri: string;
    restaurantId?: string;
    bookingId?: string;
    filterId?: string;
    capturedAt?: string;
  }>();
  const [caption, setCaption] = useState('');
  const [rating, setRating] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [userProfile, setUserProfile] = useState<AppUserProfile | null>(null);

  // Load the signed-in customer's profile so we can show their real avatar +
  // name when posting. Demo mode keeps the mockCustomer fallback per CLAUDE.md.
  useEffect(() => {
    if (isDemoModeEnabled()) return;
    if (!isAuthenticated || !user?.id) return;
    let alive = true;
    void fetchCurrentUserProfile()
      .then((profile) => {
        if (alive) setUserProfile(profile);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isAuthenticated, user?.id]);

  const profileDisplayName = useMemo(() => {
    if (isDemoModeEnabled()) return mockCustomer.fullName;
    return userProfile?.fullName?.trim() || user?.email?.split('@')[0] || 'User';
  }, [userProfile, user?.email]);

  const profileHandle = useMemo(() => {
    const firstWord = profileDisplayName.split(/\s+/)[0] ?? '';
    const slug = firstWord
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 16);
    return slug ? `@${slug}` : '@user';
  }, [profileDisplayName]);

  const profileAvatarUrl = useMemo(() => {
    if (isDemoModeEnabled()) return mockCustomer.avatarUrl;
    return userProfile?.avatarUrl ?? null;
  }, [userProfile]);
  const [photoAspect, setPhotoAspect] = useState(DEFAULT_SNAP_PHOTO_ASPECT);
  const [posting, setPosting] = useState(false);

  const decodedUri = photoUri
    ? (() => {
        try {
          return decodeURIComponent(photoUri);
        } catch {
          return photoUri;
        }
      })()
    : '';
  const selectedFilterId = useMemo<StoryFilterId | null>(() => {
    if (!filterId) return null;
    return STORY_FILTERS.some((filter) => filter.id === filterId)
      ? (filterId as StoryFilterId)
      : null;
  }, [filterId]);
  const capturedAt = useMemo(() => {
    const value = Number(capturedAtParam);
    return Number.isFinite(value) && value > 0 ? value : Date.now();
  }, [capturedAtParam]);
  const previewLayout = getSnapPreviewLayout({
    photoAspect,
    maxWidth: windowW - spacing.lg * 2,
    maxHeight: Math.min(560, Math.max(360, windowH - insets.top - insets.bottom - 180)),
    // Composite snaps from the camera are full-screen 9:19.5 (~0.46 aspect).
    // The default 0.75 minimum would clamp the container wider than the photo,
    // causing contentFit="cover" to crop top + bottom. Allow the container to
    // match the composite's actual aspect so nothing gets clipped.
    minAspect: 0.45,
  });
  const photoW = previewLayout.width;
  const photoH = previewLayout.height;

  const restaurantName = restaurantId ? getSnapRestaurantName(restaurantId) : 'Restaurant';
  const goBackToCapture = () => {
    const fallback: Href = restaurantId
      ? {
          pathname: '/(customer)/discover/post-review/camera',
          params: { restaurantId, ...(bookingId ? { bookingId } : {}) },
        }
      : '/(customer)/discover/post-review';
    safeRouterBack(router, fallback);
  };
  const restaurant = useMemo(
    () => mockRestaurants.find((item) => item.id === restaurantId) ?? null,
    [restaurantId],
  );
  const selectedRestaurantName = restaurant?.name ?? restaurantName;
  const selectedRestaurantCity = restaurant?.city ?? 'Toronto';
  const selectedRestaurantArea = restaurant?.area ?? selectedRestaurantCity;

  const handlePhotoLoad = useCallback((event: ImageLoadEventData) => {
    const { width, height } = event.source ?? {};
    if (width > 0 && height > 0) {
      setPhotoAspect(width / height);
    }
  }, []);

  const postSnap = async () => {
    if (!restaurantId || !decodedUri || !caption.trim() || rating === 0 || posting) return;
    setPosting(true);
    let navigated = false;

    try {
      const cleanCaption = normalizeTextInput(caption, { maxLength: 220, multiline: true });
      const userId = me;
      if (!userId) {
        setPosting(false);
        return;
      }

      // Keep the in-memory snap so the reward/share sheet renders immediately.
      createSnapPost({
        user_id: userId,
        restaurant_id: restaurantId,
        booking_id: bookingId,
        image: decodedUri,
        caption: cleanCaption,
        rating,
        tags: [],
        storyFilterId: selectedFilterId ?? undefined,
        storyFilterCapturedAt: selectedFilterId ? capturedAt : undefined,
      });

      // Persist to Supabase whenever the user is authenticated, regardless of
      // whether a bookingId is present (covers the past-restaurants carousel flow).
      if (isAuthenticated && user?.id) {
        const photoId = Crypto.randomUUID();
        void (async () => {
          try {
            const publicUrl = await uploadSnapPhoto({
              uri: decodedUri,
              userId: user.id,
              photoId,
            });
            if (publicUrl) {
              await insertVisitPhoto({
                userId: user.id,
                restaurantId,
                imageUrl: publicUrl,
                caption: cleanCaption,
                bookingId: bookingId ?? null,
                storyFilterId: selectedFilterId ?? null,
                storyFilterCapturedAt: selectedFilterId ? capturedAt : null,
                rating,
                tags: [],
              });
            }
            // Also write to restaurant_reviews so the rating + caption appears
            // in the Reviews section of the restaurant detail page.
            try {
              await insertRestaurantReview({
                userId: user.id,
                restaurantId,
                rating,
                body: cleanCaption,
              });
            } catch {
              // Non-fatal — the snap photo + rating are already persisted.
            }
          } catch {
            // Fire-and-forget: UI already navigated away; don't alert the user.
          }
        })();
      }

      navigated = true;
      router.replace({
        pathname: '/(customer)/discover/post-review/reward',
        params: {
          points: '25',
          restaurantName,
          restaurantId,
          ...(bookingId ? { bookingId } : {}),
          photoUri: encodeURIComponent(decodedUri),
          rating: String(rating),
          ...(selectedFilterId
            ? {
                filterId: selectedFilterId,
                capturedAt: String(capturedAt),
              }
            : {}),
        },
      });
    } catch (err) {
      console.warn('[connect.postSnap] failed:', err);
      Alert.alert('Could not post snap', 'Please try again.');
    } finally {
      if (!navigated) setPosting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0A0A0A', '#050505', '#0A0A0A']} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable
            onPress={goBackToCapture}
            hitSlop={12}
            style={({ pressed }) => [styles.headerIconBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color={c.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Add Caption
          </Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {decodedUri ? (
            selectedFilterId ? (
              <View style={[styles.imageBlock, { width: photoW, height: photoH }]}>
                <StoryFilterFrame
                  filterId={selectedFilterId}
                  width={photoW}
                  height={photoH}
                  capturedAt={capturedAt}
                  restaurantName={selectedRestaurantName}
                  city={selectedRestaurantCity}
                  area={selectedRestaurantArea}
                  mediaSlot={
                    <Image
                      source={{ uri: decodedUri }}
                      style={styles.previewImage}
                      contentFit="cover"
                      contentPosition="center"
                      onLoad={handlePhotoLoad}
                    />
                  }
                />
              </View>
            ) : (
              <View style={[styles.imageBlock, { width: photoW, height: photoH }]}>
                <Image
                  source={{ uri: decodedUri }}
                  style={styles.previewImage}
                  contentFit="cover"
                  contentPosition="center"
                  onLoad={handlePhotoLoad}
                />
              </View>
            )
          ) : (
            <View style={[styles.previewImage, styles.imagePlaceholder, { width: photoW, height: photoH }]} />
          )}

          <View style={styles.metaSection}>
            <View style={styles.identityRow}>
              {profileAvatarUrl ? (
                <Image source={{ uri: profileAvatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatar} />
              )}
              <View style={styles.identityText}>
                <Text style={styles.username}>{profileHandle}</Text>
                <Text style={styles.restaurantLine}>Posting to {restaurantName}</Text>
              </View>
            </View>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Rate this visit</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((value) => {
                  const active = value <= rating;
                  return (
                    <Pressable key={value} onPress={() => setRating(value as 1 | 2 | 3 | 4 | 5)} hitSlop={8}>
                      <Ionicons
                        name={active ? 'star' : 'star-outline'}
                        size={22}
                        color={c.gold}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.inputSection}>
            <TextInput
              value={caption}
              onChangeText={(value) => setCaption(sanitizeTextInput(value, { maxLength: 220, multiline: true }))}
              placeholder="How was it?"
              placeholderTextColor={c.textMuted}
              multiline
              style={styles.input}
              maxLength={220}
            />
            <Text style={styles.counter}>{caption.length}/220</Text>
          </View>

        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(4, Math.min(insets.bottom, 8)),
              paddingHorizontal: H_PAD,
            },
          ]}
        >
          <Button
            title={posting ? 'Posting...' : 'Post'}
            onPress={postSnap}
            disabled={posting || !caption.trim() || rating === 0 || !restaurantId || !decodedUri}
            loading={posting}
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
