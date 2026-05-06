import React, { useCallback, useMemo, useState } from 'react';
import {
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
import { createSnapPost, getSnapRestaurantName, TAG_POOL } from '@/lib/mock/snaps';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { mockCustomer } from '@/lib/mock/users';
import { STORY_FILTERS } from '@/lib/storyFilters/registry';
import {
  DEFAULT_SNAP_PHOTO_ASPECT,
  getSnapPreviewLayout,
} from '@/lib/storyFilters/previewLayout';
import type { StoryFilterId } from '@/lib/storyFilters/types';

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
    paddingTop: spacing.lg,
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
    marginTop: spacing.lg,
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
  const { width: windowW, height: windowH } = useWindowDimensions();
  const {
    photoUri,
    restaurantId,
    filterId,
    capturedAt: capturedAtParam,
  } = useLocalSearchParams<{
    photoUri: string;
    restaurantId?: string;
    filterId?: string;
    capturedAt?: string;
  }>();
  const [caption, setCaption] = useState('');
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [dish, setDish] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [photoAspect, setPhotoAspect] = useState(DEFAULT_SNAP_PHOTO_ASPECT);

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const addCustomTag = () => {
    const raw = tagInput.trim().toLowerCase();
    if (!raw) return;
    const normalized = raw.startsWith('#') ? raw : `#${raw}`;
    if (!tags.includes(normalized)) setTags([...tags, normalized]);
    setTagInput('');
  };

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
    maxHeight: Math.min(420, Math.max(320, windowH - insets.top - insets.bottom - 280)),
  });
  const photoW = previewLayout.width;
  const photoH = previewLayout.height;

  const restaurantName = restaurantId ? getSnapRestaurantName(restaurantId) : 'Restaurant';
  const goBackToCapture = () => {
    const fallback: Href = restaurantId
      ? {
          pathname: '/(customer)/discover/post-review/camera',
          params: { restaurantId },
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

  const postSnap = () => {
    if (!restaurantId || !decodedUri || !caption.trim()) return;
    createSnapPost({
      user_id: mockCustomer.id,
      restaurant_id: restaurantId,
      image: decodedUri,
      caption: caption.trim(),
      rating,
      tags,
      dish: dish.trim() || undefined,
      storyFilterId: selectedFilterId ?? undefined,
      storyFilterCapturedAt: selectedFilterId ? capturedAt : undefined,
    });
    router.replace({
      pathname: '/(customer)/discover/post-review/reward',
      params: {
        points: '25',
        restaurantName,
        restaurantId,
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
                      contentPosition="bottom"
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
                  contentPosition="bottom"
                  onLoad={handlePhotoLoad}
                />
              </View>
            )
          ) : (
            <View style={[styles.previewImage, styles.imagePlaceholder, { width: photoW, height: photoH }]} />
          )}

          <View style={styles.metaSection}>
            <View style={styles.identityRow}>
              {mockCustomer.avatarUrl ? (
                <Image source={{ uri: mockCustomer.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatar} />
              )}
              <View style={styles.identityText}>
                <Text style={styles.username}>@alexj</Text>
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
                        color={active ? c.gold : c.textMuted}
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
              onChangeText={setCaption}
              placeholder="How was it?"
              placeholderTextColor={c.textMuted}
              multiline
              style={styles.input}
              maxLength={220}
            />
            <Text style={styles.counter}>{caption.length}/220</Text>
          </View>

          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>Dish name (optional)</Text>
            <TextInput
              value={dish}
              onChangeText={setDish}
              placeholder="e.g. Tonkotsu ramen"
              placeholderTextColor={c.textMuted}
              style={styles.lineInput}
              maxLength={60}
            />
          </View>

          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>Tags</Text>
            <View style={styles.tagPoolRow}>
              {TAG_POOL.map((tag) => {
                const on = tags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={[styles.tagChip, on && styles.tagChipOn]}
                  >
                    <Text style={[styles.tagChipText, on && styles.tagChipTextOn]}>{tag}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.customTagRow}>
              <TextInput
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="Add your own tag"
                placeholderTextColor={c.textMuted}
                style={styles.lineInput}
                onSubmitEditing={addCustomTag}
                autoCapitalize="none"
                maxLength={24}
              />
              <Pressable
                onPress={addCustomTag}
                disabled={!tagInput.trim()}
                style={({ pressed }) => [
                  styles.addBtn,
                  (!tagInput.trim() || pressed) && { opacity: 0.5 },
                ]}
              >
                <Ionicons name="add" size={20} color={c.bgBase} />
              </Pressable>
            </View>
            {tags.length > 0 ? (
              <View style={styles.selectedRow}>
                {tags.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => toggleTag(t)}
                    style={styles.selectedChip}
                  >
                    <Text style={styles.selectedChipText}>{t}</Text>
                    <Ionicons name="close" size={13} color={c.bgBase} />
                  </Pressable>
                ))}
              </View>
            ) : null}
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
            title="Post"
            onPress={postSnap}
            disabled={!caption.trim() || !restaurantId || !decodedUri}
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
