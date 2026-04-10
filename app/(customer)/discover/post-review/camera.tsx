import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { snapFilters } from '@/lib/mock/reviewSnap';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';

export default function ReviewCameraScreen() {
  const router = useRouter();
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [selectedFilter, setSelectedFilter] = useState(snapFilters[0].id);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);
  const isIosSimulator = Platform.OS === 'ios' && !Device.isDevice;

  const activeFilter = useMemo(
    () => snapFilters.find((filter) => filter.id === selectedFilter) ?? snapFilters[0],
    [selectedFilter],
  );

  const toggleFacing = () => {
    setCameraFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash((prev) => (prev === 'off' ? 'on' : 'off'));
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || !restaurantId || capturing) return;
    try {
      setCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!photo?.uri) return;
      const encodedUri = encodeURIComponent(photo.uri);
      router.push(
        `/(customer)/discover/post-review/preview?restaurantId=${restaurantId}&photoUri=${encodedUri}&filter=${selectedFilter}`,
      );
    } finally {
      setCapturing(false);
    }
  };

  const openGalleryFallback = async () => {
    if (!restaurantId) return;
    const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!libraryPermission.granted) {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: false,
      selectionLimit: 1,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const encodedUri = encodeURIComponent(result.assets[0].uri);
    router.push(
      `/(customer)/discover/post-review/preview?restaurantId=${restaurantId}&photoUri=${encodedUri}&filter=${selectedFilter}`,
    );
  };

  const openSettings = () => {
    Linking.openSettings();
  };

  if (!permission) return <View style={styles.loadingRoot} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionRoot}>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionBody}>Enable camera access to capture your Seatly Snap.</Text>
        <Pressable onPress={requestPermission} style={styles.permissionBtn}>
          <Text style={styles.permissionBtnText}>Allow camera</Text>
        </Pressable>
        <Pressable onPress={openSettings} style={styles.permissionGhostBtn}>
          <Text style={styles.permissionGhostBtnText}>Open settings</Text>
        </Pressable>
      </View>
    );
  }

  const showSimulatorFallback = isIosSimulator || !!cameraError;

  return (
    <View style={styles.root}>
      {!showSimulatorFallback ? (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={cameraFacing}
          flash={flash}
          onCameraReady={() => setCameraReady(true)}
          onMountError={(event) => setCameraError(event.message ?? 'Unable to start camera')}
        />
      ) : (
        <View style={styles.fallbackRoot}>
          <Text style={styles.fallbackTitle}>Camera preview unavailable</Text>
          <Text style={styles.fallbackBody}>
            Live camera may not work in iOS Simulator. Use a test image from your gallery to continue this flow.
          </Text>
          {cameraError ? <Text style={styles.fallbackError}>{cameraError}</Text> : null}
          <Pressable onPress={openGalleryFallback} style={styles.fallbackBtn}>
            <Text style={styles.fallbackBtnText}>Choose test image</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.overlay} pointerEvents="box-none">
        <View
          pointerEvents="none"
          style={[
            styles.filterOverlay,
            { backgroundColor: activeFilter.overlayColor, opacity: activeFilter.overlayOpacity },
          ]}
        />
        <View style={styles.topControls}>
          <Pressable onPress={() => router.back()} style={styles.controlBtn}>
            <Text style={styles.controlText}>Back</Text>
          </Pressable>
          <Pressable onPress={toggleFlash} style={styles.controlBtn}>
            <Text style={styles.controlText}>{flash === 'on' ? 'Flash On' : 'Flash Off'}</Text>
          </Pressable>
        </View>

        <View style={styles.bottomControls}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {snapFilters.map((filter) => {
              const selected = selectedFilter === filter.id;
              return (
                <Pressable
                  key={filter.id}
                  onPress={() => setSelectedFilter(filter.id)}
                  style={[styles.filterChip, selected && styles.filterChipSelected]}
                >
                  <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>
                    {filter.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.captureRow}>
            <Pressable onPress={toggleFacing} style={styles.secondaryRoundBtn}>
              <Text style={styles.secondaryRoundBtnText}>Flip</Text>
            </Pressable>
            <Pressable
              onPress={showSimulatorFallback ? openGalleryFallback : capturePhoto}
              disabled={!showSimulatorFallback && (!cameraReady || capturing)}
              style={styles.captureBtn}
            >
              {capturing ? (
                <ActivityIndicator color={colors.bgBase} />
              ) : (
                <View style={styles.captureInner} />
              )}
            </Pressable>
            <Pressable onPress={openGalleryFallback} style={styles.secondaryRoundBtn}>
              <Text style={styles.secondaryRoundBtnText}>Gallery</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  loadingRoot: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  permissionRoot: {
    flex: 1,
    backgroundColor: colors.bgBase,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    gap: spacing.md,
  },
  permissionTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  permissionBody: {
    ...typography.body,
    color: colors.textSecondary,
  },
  permissionBtn: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  permissionBtnText: {
    ...typography.bodySmall,
    color: colors.goldLight,
    fontWeight: '700',
  },
  permissionGhostBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  permissionGhostBtnText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  fallbackRoot: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bgElevated,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    gap: spacing.md,
  },
  fallbackTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  fallbackBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  fallbackError: {
    ...typography.bodySmall,
    color: '#d8b38a',
    textAlign: 'center',
  },
  fallbackBtn: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: 'rgba(201, 168, 76, 0.14)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  fallbackBtnText: {
    ...typography.bodySmall,
    color: colors.goldLight,
    fontWeight: '700',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  filterOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topControls: {
    paddingTop: spacing['4xl'],
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlBtn: {
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(10,10,10,0.45)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  controlText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  bottomControls: {
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  filterRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  filterChip: {
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(10,10,10,0.45)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterChipSelected: {
    borderColor: 'rgba(201, 168, 76, 0.8)',
    backgroundColor: 'rgba(201, 168, 76, 0.22)',
  },
  filterChipText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  filterChipTextSelected: {
    color: colors.goldLight,
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
  },
  secondaryRoundBtn: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,10,10,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
  },
  secondaryRoundBtnText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  captureBtn: {
    width: 78,
    height: 78,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,10,10,0.35)',
  },
  captureInner: {
    width: 62,
    height: 62,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gold,
  },
});
