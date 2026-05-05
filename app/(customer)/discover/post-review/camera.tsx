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
} from 'react-native';
import { Image } from 'expo-image';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useColors, createStyles, borderRadius, spacing, typography } from '@/lib/theme';
import { getSnapRestaurantName } from '@/lib/mock/snaps';
import { openAppPhotoSettings } from '@/lib/device/openAppPhotoSettings';

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
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  editLink: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  editLinkText: {
    ...typography.body,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  editPrimary: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  editPrimaryText: {
    ...typography.body,
    color: '#DDD5C4',
    fontWeight: '700',
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
  const params = useLocalSearchParams<{
    restaurantId: string;
  }>();
  const { restaurantId } = params;

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<'camera' | 'gallery' | null>(null);

  const cameraRef = useRef<CameraView | null>(null);
  const shutterOpacity = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const galleryOpeningRef = useRef(false);
  const [captureFill, setCaptureFill] = useState(false);

  const isEditMode = !!selectedImageUri;
  const restaurantName = useMemo(
    () => (restaurantId ? getSnapRestaurantName(restaurantId) : 'Restaurant'),
    [restaurantId],
  );
  const effectiveFlash = useMemo(
    () => (cameraFacing === 'back' ? flash : 'off'),
    [cameraFacing, flash],
  );
  const canUseCamera = Boolean(permission?.granted) && !cameraUnavailable;

  const TAB_BAR_STYLE = {
    backgroundColor: c.bgSurface,
    borderTopColor: c.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 0,
  };

  useFocusEffect(
    useCallback(() => {
      const tab = navigation.getParent();
      tab?.setOptions({ tabBarStyle: { display: 'none', height: 0, overflow: 'hidden' } });
      return () => {
        tab?.setOptions({ tabBarStyle: TAB_BAR_STYLE });
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
          const uri = pending.assets?.[0]?.uri;
          if (uri) {
            setSelectedImageUri(uri);
            setSelectedSource('gallery');
          }
        } catch {
          // Android may surface edge cases; ignore
        }
      })();
      return () => {
        alive = false;
      };
    }, []),
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
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setSelectedImageUri(result.assets[0].uri);
      setSelectedSource('gallery');
    } catch {
      Alert.alert(
        'Could not open photos',
        'Something went wrong opening your photo library. Please try again.',
      );
    }
  }, []);

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
      // skipProcessing: tells expo-camera to NOT apply HDR / auto-tone / etc.
      // The pixels we save match exactly what was on screen at the moment of
      // capture — no lighting/colour shift between live view and saved frame.
      // exif: keeps EXIF metadata so iOS knows the rotation; downstream
      // <Image> renders it in the correct orientation (no horizontal flip).
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        skipProcessing: true,
        exif: true,
      });
      if (!photo?.uri) return;
      setSelectedImageUri(photo.uri);
      setSelectedSource('camera');
    } finally {
      setCapturing(false);
    }
  };

  const goNext = () => {
    if (!selectedImageUri) return;
    const encodedUri = encodeURIComponent(selectedImageUri);
    // Skip the standalone preview screen — go straight to the filter picker.
    // Filters + captioning happen there; preview was a redundant step.
    router.push(
      `/(customer)/discover/post-review/styles?photoUri=${encodedUri}&restaurantId=${restaurantId}`,
    );
  };

  const goBack = () => {
    if (isEditMode) {
      setSelectedImageUri(null);
      setSelectedSource(null);
      return;
    }
    router.back();
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {isEditMode ? (
        <Image source={{ uri: selectedImageUri! }} style={styles.cameraFill} contentFit="contain" />
      ) : canUseCamera ? (
        <CameraView
          ref={cameraRef}
          pointerEvents="none"
          style={styles.cameraFill}
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

      <Animated.View pointerEvents="none" style={[styles.shutter, { opacity: shutterOpacity }]} />

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.82)']}
        locations={[0, 0.55, 1]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      <View style={styles.chrome} pointerEvents="box-none">
        <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
          <Pressable onPress={goBack} hitSlop={12} style={styles.topIconHit} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </Pressable>
          <Text style={styles.topTitle} numberOfLines={1}>
            Posting to {restaurantName}
          </Text>
          {isEditMode ? <View style={styles.topIconHit} /> : (
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
          )}
        </View>

        <View
          pointerEvents="auto"
          style={[styles.bottomUi, { paddingBottom: insets.bottom + 20 }]}
        >
          {!isEditMode ? (
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

              <Pressable
                onPress={canUseCamera ? capturePhoto : () => void openGallery()}
                onPressIn={onCapturePressIn}
                onPressOut={onCapturePressOut}
                disabled={canUseCamera && (!cameraReady || capturing)}
                style={styles.captureHit}
              >
                <Animated.View style={[styles.captureRing, { transform: [{ scale: pressScale }] }]}>
                  <View style={styles.captureOuterRing}>
                    <View style={[styles.captureInner, captureFill && styles.captureInnerActive]}>
                      {capturing ? <ActivityIndicator color="rgba(0,0,0,0.45)" size="small" /> : null}
                    </View>
                  </View>
                </Animated.View>
              </Pressable>

              <GlassCircle
                onPress={() => {
                  setCameraFacing((prev) => (prev === 'back' ? 'front' : 'back'));
                }}
              >
                <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
              </GlassCircle>
            </View>
          ) : (
            <View style={styles.editRow}>
              <Pressable onPress={() => setSelectedImageUri(null)} style={styles.editLink}>
                <Text style={styles.editLinkText}>Retake</Text>
              </Pressable>
              <Pressable onPress={goNext} style={styles.editPrimary}>
                <Text style={styles.editPrimaryText}>Next</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
