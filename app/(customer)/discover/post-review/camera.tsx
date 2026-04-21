import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { snapFilters } from '@/lib/mock/reviewSnap';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';
import { getSnapRestaurantName } from '@/lib/mock/snaps';

const TAB_BAR_STYLE = {
  backgroundColor: colors.bgSurface,
  borderTopColor: colors.border,
  borderTopWidth: StyleSheet.hairlineWidth,
  paddingTop: 0,
} as const;

/** Glass-like chrome without native blur (safe on Simulator & all platforms). */
function GlassBar({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.topBarGlass, style]}>{children}</View>;
}

function GlassCircle({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  return (
    <View style={styles.sideBtnGlass}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.sideBtnInner, pressed && styles.sideBtnPressed]}>
        {children}
      </Pressable>
    </View>
  );
}

export default function ReviewCameraScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [selectedFilter, setSelectedFilter] = useState(snapFilters[0].id);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<'camera' | 'gallery' | null>(null);

  const cameraRef = useRef<CameraView | null>(null);
  const shutterOpacity = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const [captureFill, setCaptureFill] = useState(false);

  const isEditMode = !!selectedImageUri;
  const restaurantName = useMemo(
    () => (restaurantId ? getSnapRestaurantName(restaurantId) : 'Restaurant'),
    [restaurantId],
  );
  const activeFilter = useMemo(
    () => snapFilters.find((f) => f.id === selectedFilter) ?? snapFilters[0],
    [selectedFilter],
  );

  useFocusEffect(
    useCallback(() => {
      const tab = navigation.getParent();
      tab?.setOptions({ tabBarStyle: { display: 'none', height: 0, overflow: 'hidden' } });
      return () => {
        tab?.setOptions({ tabBarStyle: TAB_BAR_STYLE });
      };
    }, [navigation]),
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

  const openGallery = async () => {
    Vibration.vibrate(8);
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      selectionLimit: 1,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setSelectedImageUri(result.assets[0].uri);
    setSelectedSource('gallery');
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || capturing) return;
    try {
      setCapturing(true);
      Vibration.vibrate(10);
      pulseCapture();
      runShutter();
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (!photo?.uri) return;
      setSelectedImageUri(photo.uri);
      setSelectedSource('camera');
    } finally {
      setCapturing(false);
    }
  };

  const goNext = () => {
    if (!selectedImageUri) return;
    Vibration.vibrate(8);
    const encodedUri = encodeURIComponent(selectedImageUri);
    router.push(
      `/(customer)/discover/post-review/preview?photoUri=${encodedUri}&filter=${selectedFilter}&restaurantId=${restaurantId}`,
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

  if (!permission) {
    return <View style={styles.root} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionRoot}>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionBody}>Allow camera to capture your snap.</Text>
        <Pressable onPress={requestPermission} style={styles.permissionBtn}>
          <Text style={styles.permissionBtnText}>Continue</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {isEditMode ? (
        <Image source={{ uri: selectedImageUri! }} style={styles.cameraFill} resizeMode="cover" />
      ) : !cameraUnavailable ? (
        <CameraView
          ref={cameraRef}
          style={styles.cameraFill}
          facing={cameraFacing}
          flash={flash}
          onCameraReady={() => setCameraReady(true)}
          onMountError={() => setCameraUnavailable(true)}
        />
      ) : (
        <View style={[styles.cameraFill, { backgroundColor: '#1a1a1a' }]} />
      )}

      <View pointerEvents="none" style={[styles.filterTint, { backgroundColor: activeFilter.overlayColor, opacity: activeFilter.overlayOpacity }]} />

      <Animated.View pointerEvents="none" style={[styles.shutter, { opacity: shutterOpacity }]} />

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.82)']}
        locations={[0, 0.55, 1]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      <View style={styles.chrome} pointerEvents="box-none">
        <GlassBar style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
          <Pressable onPress={goBack} hitSlop={12} style={styles.topIconHit}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.topTitle} numberOfLines={1}>
            Posting to {restaurantName}
          </Text>
          <Pressable
            onPress={() => {
              Vibration.vibrate(6);
              setFlash((f) => (f === 'off' ? 'on' : 'off'));
            }}
            hitSlop={12}
            style={styles.topIconHit}
            accessibilityLabel="Flash"
          >
            <Ionicons name="settings-outline" size={21} color="#fff" />
          </Pressable>
        </GlassBar>

        <View style={[styles.bottomUi, { paddingBottom: insets.bottom + 20 }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
            decelerationRate="fast"
          >
            {snapFilters.map((f) => {
              const selected = selectedFilter === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => {
                    Vibration.vibrate(5);
                    setSelectedFilter(f.id);
                  }}
                  style={({ pressed }) => [styles.filterTextHit, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.filterText, selected && styles.filterTextSelected]} numberOfLines={1}>
                    {f.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {!isEditMode ? (
            <View style={styles.captureRow}>
              <GlassCircle onPress={openGallery}>
                <Ionicons name="images-outline" size={22} color="#fff" />
              </GlassCircle>

              <Pressable
                onPress={cameraUnavailable ? openGallery : capturePhoto}
                onPressIn={onCapturePressIn}
                onPressOut={onCapturePressOut}
                disabled={!cameraUnavailable && (!cameraReady || capturing)}
                style={styles.captureHit}
              >
                <Animated.View style={[styles.captureRing, { transform: [{ scale: pressScale }] }]}>
                  <View style={styles.captureOuterRing}>
                    <View style={[styles.captureInner, captureFill && styles.captureInnerActive]}>
                      {capturing ? (
                        <ActivityIndicator color={captureFill ? colors.bgBase : colors.gold} size="small" />
                      ) : captureFill ? null : (
                        <View style={styles.captureGoldDot} />
                      )}
                    </View>
                  </View>
                </Animated.View>
              </Pressable>

              <GlassCircle
                onPress={() => {
                  Vibration.vibrate(6);
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraFill: {
    ...StyleSheet.absoluteFillObject,
  },
  filterTint: {
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
  },
  topBarGlass: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: borderRadius.lg,
    gap: 8,
  },
  topIconHit: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  bottomUi: {
    paddingHorizontal: spacing.lg,
    gap: 28,
  },
  filterScrollContent: {
    flexDirection: 'row',
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 22,
    paddingHorizontal: 12,
    minWidth: '100%',
  },
  filterTextHit: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  filterText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.2,
  },
  filterTextSelected: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.goldLight,
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  sideBtnGlass: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sideBtnInner: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideBtnPressed: {
    opacity: 0.86,
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
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInnerActive: {
    backgroundColor: colors.gold,
  },
  captureGoldDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold,
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
    color: colors.goldLight,
    fontWeight: '700',
  },
  permissionRoot: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  permissionTitle: {
    ...typography.h2,
    color: '#fff',
  },
  permissionBody: {
    ...typography.body,
    color: colors.textSecondary,
  },
  permissionBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gold,
  },
  permissionBtnText: {
    ...typography.body,
    color: colors.bgBase,
    fontWeight: '700',
  },
});
