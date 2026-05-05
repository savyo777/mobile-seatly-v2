import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, ScreenWrapper } from '@/components/ui';
import { snapFilters } from '@/lib/mock/reviewSnap';
import { SnapFilterOverlay } from '@/components/snaps/SnapFilterOverlay';
import { useColors, createStyles, borderRadius, spacing, typography } from '@/lib/theme';
import { getSnapRestaurantName } from '@/lib/mock/snaps';
import { safeRouterBack } from '@/lib/navigation/transitions';

const useStyles = createStyles((c) => ({
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
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  headerTitle: {
    flex: 1,
    ...typography.h3,
    color: c.textPrimary,
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
    color: c.textSecondary,
  },
  photoWrap: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: c.bgElevated,
    width: '100%',
    minHeight: 200,
  },
  photoBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  photoBackdropShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  photoPlaceholder: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  placeholderText: {
    ...typography.bodySmall,
    color: c.textMuted,
  },
  filterOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  depthOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  postingTo: {
    ...typography.body,
    color: '#DDD5C4',
    fontWeight: '600',
  },
  errorText: {
    ...typography.bodySmall,
    color: c.danger,
  },
  retakeLink: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  retakeLinkText: {
    ...typography.bodySmall,
    color: c.textMuted,
    textDecorationLine: 'underline',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.bgBase,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
}));

export default function ReviewPreviewScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { restaurantId, photoUri, filter } = useLocalSearchParams<{
    restaurantId?: string;
    photoUri?: string;
    filter?: string;
  }>();

  const { width: windowW, height: windowH } = useWindowDimensions();
  const [navigating, setNavigating] = useState(false);
  const [navError, setNavError] = useState<string | null>(null);

  const photoDisplayW = Math.max(1, windowW - spacing.lg * 2);
  const photoDisplayH = Math.max(
    240,
    Math.min(photoDisplayW * (4 / 3), windowH - insets.top - insets.bottom - 270),
  );

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

  const goBackToCapture = useCallback(() => {
    const fallback: Href = restaurantId
      ? {
          pathname: '/(customer)/discover/post-review/camera',
          params: { restaurantId },
        }
      : '/(customer)/discover/post-review';
    safeRouterBack(router, fallback);
  }, [restaurantId, router]);

  const goToPostDetails = useCallback(() => {
    if (!hasImage || !restaurantId) {
      setNavError('Something went wrong. Go back and try again.');
      return;
    }

    setNavError(null);
    setNavigating(true);

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
      setNavError('Something went wrong, try again.');
    } finally {
      setNavigating(false);
    }
  }, [decodedUri, filter, hasImage, restaurantId, router]);

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <View style={styles.screen}>
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable
            onPress={goBackToCapture}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color={c.textPrimary} />
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

          <View style={[styles.photoWrap, { height: photoDisplayH }]}>
            {hasImage ? (
              <>
                <Image source={{ uri: decodedUri }} style={styles.photoBackdrop} contentFit="cover" blurRadius={28} />
                <View style={styles.photoBackdropShade} />
                <Image source={{ uri: decodedUri }} style={styles.photo} contentFit="contain" />
              </>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.placeholderText}>No image loaded</Text>
              </View>
            )}
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.45)']} style={styles.depthOverlay} />
            <View pointerEvents="none" style={styles.filterOverlay}>
              <SnapFilterOverlay filter={activeFilter} />
            </View>
          </View>

          <Text style={styles.postingTo}>Posting to {restaurantName}</Text>

          {navError ? <Text style={styles.errorText}>{navError}</Text> : null}

          <Pressable onPress={goBackToCapture} style={styles.retakeLink}>
            <Text style={styles.retakeLinkText}>Retake or choose another photo</Text>
          </Pressable>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, spacing.md),
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
