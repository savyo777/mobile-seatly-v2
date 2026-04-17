import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, ScreenWrapper } from '@/components/ui';
import { snapFilters } from '@/lib/mock/reviewSnap';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';
import { getSnapRestaurantName } from '@/lib/mock/snaps';

const TAB_BAR_EXTRA = 72;

export default function ReviewPreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { restaurantId, photoUri, filter } = useLocalSearchParams<{
    restaurantId?: string;
    photoUri?: string;
    filter?: string;
  }>();

  const [navigating, setNavigating] = useState(false);
  const [navError, setNavError] = useState<string | null>(null);

  const activeFilter = useMemo(
    () => snapFilters.find((filterOption) => filterOption.id === filter) ?? snapFilters[0],
    [filter],
  );

  const decodedUri = useMemo(() => {
    if (!photoUri) return '';
    try {
      return decodeURIComponent(photoUri);
    } catch {
      return photoUri;
    }
  }, [photoUri]);

  const hasImage = decodedUri.length > 0;

  const restaurantName = useMemo(
    () => (restaurantId ? getSnapRestaurantName(restaurantId) : 'Restaurant'),
    [restaurantId],
  );

  const maxPreviewHeight = useMemo(() => {
    const { width: w, height: h } = Dimensions.get('window');
    const contentW = w - spacing.lg * 2;
    const byAspect = contentW * (16 / 9);
    return Math.min(byAspect, h * 0.48);
  }, []);

  const goToPostDetails = useCallback(() => {
    if (!hasImage || !restaurantId) {
      setNavError('Something went wrong. Go back and try again.');
      if (__DEV__) console.warn('[SnapPreview] blocked: missing image or restaurantId', { hasImage, restaurantId });
      return;
    }

    setNavError(null);
    setNavigating(true);

    if (__DEV__) {
      console.log('[SnapPreview] Next pressed → navigating to post-review/details', {
        restaurantId,
        filter: filter ?? snapFilters[0].id,
        uriLength: decodedUri.length,
      });
    }

    try {
      const href: Href = {
        pathname: '/(customer)/discover/post-review/details',
        params: {
          photoUri: encodeURIComponent(decodedUri),
          restaurantId,
          filter: filter ?? snapFilters[0].id,
        },
      };
      router.push(href);
    } catch (e) {
      if (__DEV__) console.error('[SnapPreview] navigation error', e);
      setNavError('Something went wrong, try again.');
    } finally {
      setTimeout(() => setNavigating(false), 400);
    }
  }, [decodedUri, filter, hasImage, restaurantId, router]);

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <View style={styles.screen}>
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Preview your snap
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.subtitle}>Make sure this moment looks right, then continue to add your caption.</Text>

          <View style={[styles.photoWrap, { maxHeight: maxPreviewHeight }]}>
            {hasImage ? (
              <Image source={{ uri: decodedUri }} style={styles.photo} resizeMode="cover" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.placeholderText}>No image loaded</Text>
              </View>
            )}
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.45)']} style={styles.depthOverlay} />
            <View
              pointerEvents="none"
              style={[
                styles.filterOverlay,
                { backgroundColor: activeFilter.overlayColor, opacity: activeFilter.overlayOpacity },
              ]}
            />
          </View>

          <Text style={styles.postingTo}>Posting to {restaurantName}</Text>

          {navError ? <Text style={styles.errorText}>{navError}</Text> : null}

          <Pressable onPress={() => router.back()} style={styles.retakeLink}>
            <Text style={styles.retakeLinkText}>Retake or choose another photo</Text>
          </Pressable>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, spacing.md) + TAB_BAR_EXTRA,
              paddingHorizontal: spacing.lg,
            },
          ]}
        >
          <Button
            title="Next"
            onPress={goToPostDetails}
            disabled={!hasImage || !restaurantId || navigating}
            loading={navigating}
            size="lg"
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  headerTitle: {
    flex: 1,
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  photoWrap: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.bgElevated,
    width: '100%',
    minHeight: 200,
  },
  photo: {
    width: '100%',
    height: '100%',
    minHeight: 200,
  },
  photoPlaceholder: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
  },
  placeholderText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  filterOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  depthOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  postingTo: {
    ...typography.body,
    color: colors.goldLight,
    fontWeight: '600',
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.danger,
  },
  retakeLink: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  retakeLinkText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bgBase,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
});
