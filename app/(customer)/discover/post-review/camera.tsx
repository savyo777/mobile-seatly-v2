import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useColors, createStyles, borderRadius, spacing, typography } from '@/lib/theme';
import { getSnapRestaurantName as DEMO_getSnapRestaurantName } from '@/lib/mock/snaps';
import { mockRestaurants as DEMO_RESTAURANTS } from '@/lib/mock/restaurants';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { StoryFilterFrame } from '@/components/storyFilters/StoryFilterFrame';
import { SnapFilterPicker, SNAP_FILTER_RING_SIZE } from '@/components/storyFilters/SnapFilterPicker';
import type { StoryFilterId } from '@/lib/storyFilters/types';
import { captureStyledSnapToTmpFile } from '@/lib/snapOverlays/captureStyledSnap';

const getSnapRestaurantName: typeof DEMO_getSnapRestaurantName = (id) =>
  isDemoModeEnabled() ? DEMO_getSnapRestaurantName(id) : '';
const mockRestaurants: typeof DEMO_RESTAURANTS = isDemoModeEnabled() ? DEMO_RESTAURANTS : [];

import { openAppPhotoSettings } from '@/lib/device/openAppPhotoSettings';
import { safeRouterBack } from '@/lib/navigation/transitions';

const TRANSPARENT_FRAME_STYLE = { borderRadius: 0, backgroundColor: 'transparent' };

function GlassCircle({
  onPress,
  children,
  hitSlop,
}: {
  onPress: () => void;
  children: React.ReactNode;
  hitSlop?: number;
}) {
  return (
    <View style={glassStyles.sideBtnGlass}>
      <Pressable
        onPress={onPress}
        hitSlop={hitSlop}
        android_ripple={Platform.OS === 'android' ? { borderless: true, color: 'rgba(255,255,255,0.2)' } : undefined}
        style={({ pressed }) => [glassStyles.sideBtnInner, pressed && glassStyles.sideBtnPressed]}
      >
        {children}
      </Pressable>
    </View>
  );
}

const glassStyles = StyleSheet.create({
  sideBtnGlass: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    backgroundColor: 'rgba(60,60,60,0.55)',
  },
  sideBtnInner: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideBtnPressed: {
    opacity: 0.86,
  },
});

function readExifTimestamp(exif: unknown): number | null {
  if (!exif || typeof exif !== 'object') return null;
  const record = exif as Record<string, unknown>;
  const raw =
    record.DateTimeOriginal ??
    record.DateTimeDigitized ??
    record.DateTime ??
    record.CreationDate;
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;

  const withDateDashes = raw.trim().replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
  const normalized = withDateDashes.includes('T')
    ? withDateDashes
    : withDateDashes.replace(' ', 'T');
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : null;
}

const useStyles = createStyles((c) => ({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraFill: {
    ...StyleSheet.absoluteFillObject,
  },
  shutter: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 280,
  },
  chrome: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    zIndex: 2,
    elevation: 2,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 8,
    zIndex: 20,
    elevation: 20,
  },
  topIconHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.15,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomUi: {
    paddingHorizontal: spacing.lg,
    gap: 20,
    zIndex: 20,
    elevation: 20,
  },
  galleryBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(60,60,60,0.55)',
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  captureHit: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureOuterRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  captureInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInnerActive: {
    transform: [{ scale: 0.92 }],
    opacity: 0.92,
  },
  cameraFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 260,
    backgroundColor: '#111',
  },
  cameraFallbackIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,168,76,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.42)',
    marginBottom: spacing.md,
  },
  cameraFallbackTitle: {
    ...typography.h3,
    color: '#fff',
    textAlign: 'center',
  },
  cameraFallbackBody: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.68)',
    textAlign: 'center',
    marginTop: spacing.xs,
    maxWidth: 280,
  },
  cameraFallbackActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cameraFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(0,0,0,0.36)',
  },
  cameraFallbackBtnGold: {
    backgroundColor: c.gold,
    borderColor: c.gold,
  },
  cameraFallbackBtnText: {
    ...typography.bodySmall,
    color: '#fff',
    fontWeight: '700',
  },
  cameraFallbackBtnTextGold: {
    color: c.bgBase,
  },
}));

export default function ReviewCameraScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width: windowW, height: windowH } = useWindowDimensions();
  const params = useLocalSearchParams<{
    restaurantId: string;
    bookingId?: string;
  }>();
  const { restaurantId, bookingId } = params;

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [selectedFilterId, setSelectedFilterId] = useState<StoryFilterId | null>(null);
  // Transient — set briefly during composite so viewshot rasterises the photo.
  const [capturedUri, setCapturedUri] = useState<string | null>(null);

  const cameraRef = useRef<CameraView | null>(null);
  const captureRefView = useRef<View>(null);
  const shutterOpacity = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const galleryOpeningRef = useRef(false);
  const [captureFill, setCaptureFill] = useState(false);

  const restaurant = useMemo(
    () => mockRestaurants.find((item) => item.id === restaurantId) ?? null,
    [restaurantId],
  );
  const restaurantName = useMemo(() => {
    if (restaurant?.name) return restaurant.name;
    if (restaurantId) return getSnapRestaurantName(restaurantId);
    return 'Restaurant';
  }, [restaurant?.name, restaurantId]);
  const restaurantCity = restaurant?.city ?? 'Toronto';
  const restaurantArea = restaurant?.area ?? restaurantCity;

  const effectiveFlash = useMemo(
    () => (cameraFacing === 'back' ? flash : 'off'),
    [cameraFacing, flash],
  );
  const canUseCamera = Boolean(permission?.granted) && !cameraUnavailable;

  // Filter picker placement — just above the shutter/gallery/flip row.
  const carouselBottom = insets.bottom + 80;
  const pillBottom = carouselBottom + SNAP_FILTER_RING_SIZE + 8;

  // Filter overlay is rendered at 9:16 anchored to the top of the screen so
  // every filter component's corner-anchored decorations sit in their exact
  // design space. The "extra" strip below it (windowH - filterH) is the
  // bottom dead zone where the chrome (carousel + pill + gallery/flip row)
  // lives without colliding with decorations.
  const filterOverlayH = Math.round((windowW * 16) / 9);

  const pushToCaption = useCallback(
    (uri: string, capturedAtMs: number) => {
      const encodedUri = encodeURIComponent(uri);
      const bookingQuery = bookingId ? `&bookingId=${encodeURIComponent(String(bookingId))}` : '';
      router.push(
        `/(customer)/discover/post-review/details?photoUri=${encodedUri}&restaurantId=${restaurantId}&capturedAt=${capturedAtMs}${bookingQuery}`,
      );
    },
    [bookingId, restaurantId, router],
  );

  const compositeAndGo = useCallback(
    async (rawPhotoUri: string, capturedAtMs: number) => {
      if (!selectedFilterId) {
        pushToCaption(rawPhotoUri, capturedAtMs);
        return;
      }
      setCapturedUri(rawPhotoUri);
      // Wait for the swap (CameraView → <Image>) to commit + expo-image to paint.
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await new Promise<void>((r) => setTimeout(r, 90));
      let composed: string | undefined;
      try {
        composed = await captureStyledSnapToTmpFile(captureRefView);
      } catch {
        composed = undefined;
      }
      pushToCaption(composed ?? rawPhotoUri, capturedAtMs);
      setCapturedUri(null);
    },
    [selectedFilterId, pushToCaption],
  );

  const TAB_BAR_STYLE = {
    backgroundColor: c.bgSurface,
    borderTopColor: c.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 0,
  };

  useFocusEffect(
    useCallback(() => {
      const tab = navigation.getParent?.();
      tab?.setOptions?.({ tabBarStyle: { display: 'none', height: 0, overflow: 'hidden' } });
      return () => {
        tab?.setOptions?.({ tabBarStyle: TAB_BAR_STYLE });
      };
    }, [navigation]),
  );

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void (async () => {
        try {
          const pending = await ImagePicker.getPendingResultAsync();
          if (!alive || !pending || 'code' in pending) return;
          if (pending.canceled) return;
          const asset = pending.assets?.[0];
          if (asset?.uri) {
            void compositeAndGo(asset.uri, readExifTimestamp(asset.exif) ?? Date.now());
          }
        } catch {
          // Android may surface edge cases; ignore
        }
      })();
      return () => {
        alive = false;
      };
    }, [compositeAndGo]),
  );

  useEffect(() => {
    if (!restaurantId) router.replace('/(customer)/discover/post-review');
  }, [restaurantId, router]);

  const runShutter = () => {
    Animated.sequence([
      Animated.timing(shutterOpacity, { toValue: 0.32, duration: 55, useNativeDriver: true }),
      Animated.timing(shutterOpacity, { toValue: 0, duration: 130, useNativeDriver: true }),
    ]).start();
  };

  const pulseCapture = () => {
    setCaptureFill(true);
    setTimeout(() => setCaptureFill(false), 160);
  };

  const onCapturePressIn = () => {
    Animated.spring(pressScale, { toValue: 0.95, friction: 6, useNativeDriver: true }).start();
  };

  const onCapturePressOut = () => {
    Animated.spring(pressScale, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  };

  const launchPhotoLibrary = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsMultipleSelection: false,
        exif: true,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const asset = result.assets[0];
      void compositeAndGo(asset.uri, readExifTimestamp(asset.exif) ?? Date.now());
    } catch {
      Alert.alert(
        'Could not open photos',
        'Something went wrong opening your photo library. Please try again.',
      );
    }
  }, [compositeAndGo]);

  const openGallery = useCallback(async () => {
    if (galleryOpeningRef.current) return;
    galleryOpeningRef.current = true;
    try {
      let existing: Awaited<ReturnType<typeof ImagePicker.getMediaLibraryPermissionsAsync>>;
      try {
        existing = await ImagePicker.getMediaLibraryPermissionsAsync();
      } catch {
        Alert.alert('Photos', 'Could not check photo access. Please try again.');
        return;
      }

      if (existing.granted) {
        await launchPhotoLibrary();
        return;
      }

      // No extra app alert — show the native allow / limited / deny sheet immediately.
      let r: Awaited<ReturnType<typeof ImagePicker.requestMediaLibraryPermissionsAsync>>;
      try {
        r = await ImagePicker.requestMediaLibraryPermissionsAsync();
      } catch {
        Alert.alert('Photos', 'Could not request photo access. Please try again.');
        return;
      }

      if (r.granted) {
        await launchPhotoLibrary();
        return;
      }

      if (r.canAskAgain === false) {
        const settingsBody =
          Platform.OS === 'ios'
            ? 'Photos are disabled for Cenaiva. We will open Settings on Cenaiva’s page — tap Photos, then choose full access, selected photos, or turn access on.'
            : 'Photos are disabled for Cenaiva. We will open this app’s system screen — tap Permissions, then Photos (or Files and media), and allow access.';

        Alert.alert('Photos access is off', settingsBody, [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => void openAppPhotoSettings() },
        ]);
        return;
      }

      Alert.alert(
        'Photos',
        'Without photo library access you can still take a new picture with the camera.',
        [{ text: 'OK' }],
      );
    } finally {
      galleryOpeningRef.current = false;
    }
  }, [launchPhotoLibrary]);

  const capturePhoto = async () => {
    if (!cameraRef.current || capturing) return;
    try {
      setCapturing(true);
      pulseCapture();
      runShutter();
      const capturedAt = Date.now();
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        skipProcessing: true,
        exif: true,
      });
      if (!photo?.uri) return;
      await compositeAndGo(photo.uri, readExifTimestamp(photo.exif) ?? capturedAt);
    } finally {
      setCapturing(false);
    }
  };

  const goBack = () => {
    safeRouterBack(router, '/(customer)/discover/post-review');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* CAPTURE TARGET — full-screen photo with the 9:16 filter overlay floating inside */}
      <View
        ref={captureRefView}
        collapsable={false}
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFillObject, { width: windowW, height: windowH }]}
      >
        {capturedUri ? (
          <Image
            source={{ uri: capturedUri }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            contentPosition="center"
          />
        ) : canUseCamera ? (
          <CameraView
            ref={cameraRef}
            pointerEvents="none"
            style={StyleSheet.absoluteFillObject}
            facing={cameraFacing}
            mirror={cameraFacing === 'front'}
            responsiveOrientationWhenOrientationLocked={Platform.OS === 'ios'}
            zoom={0}
            flash={effectiveFlash}
            onCameraReady={() => setCameraReady(true)}
            onMountError={() => setCameraUnavailable(true)}
          />
        ) : (
          <View style={styles.cameraFallback}>
            <View style={styles.cameraFallbackIcon}>
              {permission ? (
                <Ionicons name="camera-outline" size={26} color="#E2C778" />
              ) : (
                <ActivityIndicator color="#E2C778" size="small" />
              )}
            </View>
            <Text style={styles.cameraFallbackTitle}>
              {permission ? 'Camera access needed' : 'Preparing camera'}
            </Text>
            <Text style={styles.cameraFallbackBody}>
              Allow camera access or choose a photo to continue.
            </Text>
            <View style={styles.cameraFallbackActions}>
              <Pressable
                onPress={() => void requestPermission()}
                disabled={!permission}
                style={({ pressed }) => [
                  styles.cameraFallbackBtn,
                  styles.cameraFallbackBtnGold,
                  pressed && { opacity: 0.82 },
                  !permission && { opacity: 0.5 },
                ]}
              >
                <Ionicons name="camera" size={14} color={c.bgBase} />
                <Text style={[styles.cameraFallbackBtnText, styles.cameraFallbackBtnTextGold]}>
                  Allow
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void openGallery()}
                style={({ pressed }) => [styles.cameraFallbackBtn, pressed && { opacity: 0.82 }]}
              >
                <Ionicons name="images-outline" size={14} color="#fff" />
                <Text style={styles.cameraFallbackBtnText}>Photos</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Filter decorations overlay — 9:16, top-anchored. The strip below
            it is the dead zone the chrome lives in. Photo behind it is still
            full-screen. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: windowW,
            height: filterOverlayH,
          }}
        >
          <StoryFilterFrame
            filterId={selectedFilterId}
            width={windowW}
            height={filterOverlayH}
            capturedAt={undefined}
            restaurantName={restaurantName}
            city={restaurantCity}
            area={restaurantArea}
            mediaSlot={<View />}
            containerStyle={TRANSPARENT_FRAME_STYLE}
          />
        </View>
      </View>

      <Animated.View pointerEvents="none" style={[styles.shutter, { opacity: shutterOpacity }]} />

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.82)']}
        locations={[0, 0.55, 1]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* Filter picker — overlays above the shutter row. Tapping the centred chip captures. */}
      {canUseCamera && (
        <SnapFilterPicker
          selectedFilterId={selectedFilterId}
          onChangeSelected={setSelectedFilterId}
          carouselBottom={carouselBottom}
          pillBottom={pillBottom}
          windowW={windowW}
          capturedAt={undefined}
          restaurantName={restaurantName}
          city={restaurantCity}
          area={restaurantArea}
          onCapture={() => void capturePhoto()}
        />
      )}

      <View style={styles.chrome} pointerEvents="box-none">
        <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
          <Pressable onPress={goBack} hitSlop={12} style={styles.topIconHit} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </Pressable>
          <Text style={styles.topTitle} numberOfLines={1}>
            Posting to {restaurantName}
          </Text>
          <Pressable
            onPress={() => {
              if (!canUseCamera || cameraFacing !== 'back') return;
              setFlash((f) => (f === 'off' ? 'on' : 'off'));
            }}
            hitSlop={12}
            style={[styles.topIconHit, (!canUseCamera || cameraFacing !== 'back') && { opacity: 0.35 }]}
            accessibilityRole="button"
            accessibilityLabel={flash === 'on' ? 'Flash on' : 'Flash off'}
            accessibilityState={{ disabled: !canUseCamera || cameraFacing !== 'back' }}
          >
            <Ionicons
              name={flash === 'on' ? 'flash' : 'flash-off'}
              size={26}
              color="#fff"
            />
          </Pressable>
        </View>

        <View
          pointerEvents="auto"
          style={[styles.bottomUi, { paddingBottom: insets.bottom + 20 }]}
        >
          <View style={styles.captureRow}>
            <Pressable
              onPress={() => void openGallery()}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              style={({ pressed }) => [styles.galleryBtn, pressed && { opacity: 0.86 }]}
              accessibilityRole="button"
              accessibilityLabel="Choose from photo library"
            >
              <Ionicons name="images-outline" size={24} color="#fff" />
            </Pressable>

            {capturing ? (
              <ActivityIndicator color="rgba(255,255,255,0.85)" size="small" />
            ) : (
              <View style={{ width: 48 }} />
            )}

            <GlassCircle
              onPress={() => {
                setCameraFacing((prev) => (prev === 'back' ? 'front' : 'back'));
              }}
            >
              <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
            </GlassCircle>
          </View>
        </View>
      </View>
    </View>
  );
}
