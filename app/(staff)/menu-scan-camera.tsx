import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { CornerBrackets } from '@/components/owner/CornerBrackets';
import { setPendingMenuScan } from '@/lib/menu/pendingMenuScan';
import { brandGold } from '@/lib/theme/tokens';
import { friendlyError } from '@/lib/errors/friendlyError';

const CAPTURE_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('camera_capture_timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export default function MenuScanCameraScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);

  useFocusEffect(useCallback(() => { setCapturing(false); }, []));

  const handleClose = useCallback(() => { router.back(); }, [router]);

  const handleCapture = useCallback(async () => {
    if (capturing) return;
    const camera = cameraRef.current;
    if (!camera) return;
    setCapturing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const photo = await withTimeout(
        camera.takePictureAsync({ base64: true, quality: 0.7, skipProcessing: false }),
        CAPTURE_TIMEOUT_MS,
      );
      if (!photo?.base64 || !photo?.uri) return;
      setPendingMenuScan({ uri: photo.uri, base64: photo.base64, mimeType: 'image/jpeg', source: 'camera' });
      router.replace('/(staff)/menu-scan-review' as never);
    } catch (err) {
      if (__DEV__) console.warn('menu-scan-camera: capture failed', err);
      Alert.alert(t('common.error'), friendlyError(undefined, 'Try again, or pick a photo from your library.'));
    } finally {
      setCapturing(false);
    }
  }, [capturing, router, t]);

  const handleRequestPermission = useCallback(() => {
    if (permission && !permission.canAskAgain) {
      void Linking.openSettings();
      return;
    }
    void requestPermission();
  }, [permission, requestPermission]);

  if (!permission) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
        <StatusBar style="light" />
        <ActivityIndicator color={brandGold.dark} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
        <StatusBar style="light" />
        <View style={styles.iconWrap}>
          <Ionicons name="camera-outline" size={36} color={brandGold.dark} />
        </View>
        <Text style={styles.title}>{t('owner.menuScanCameraPermission')}</Text>
        <Pressable style={styles.primaryBtn} onPress={handleRequestPermission}>
          <Text style={styles.primaryBtnText}>
            {permission.canAskAgain ? t('owner.menuScanSourceCamera') : t('owner.menuScanCameraPermission')}
          </Text>
        </Pressable>
        <Pressable style={styles.tertiaryBtn} onPress={handleClose}>
          <Text style={styles.tertiaryBtnText}>{t('owner.menuScanCancel')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <View pointerEvents="none" style={styles.bracketsLayer}>
        <View style={styles.bracketsBox}>
          <CornerBrackets style={StyleSheet.absoluteFill} length={28} thickness={2} pulse />
        </View>
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]} pointerEvents="box-none">
        <Pressable accessibilityRole="button" hitSlop={12} onPress={handleClose} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color="#FFF" />
        </Pressable>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Capture menu photo"
          onPress={handleCapture}
          disabled={capturing}
          style={({ pressed }) => [styles.shutter, pressed && { transform: [{ scale: 0.94 }] }]}
        >
          {capturing ? <ActivityIndicator color="#111" /> : <View style={styles.shutterInner} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 28 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(201,168,76,0.16)' },
  title: { color: '#FFF', fontSize: 17, textAlign: 'center', fontWeight: '600' },
  primaryBtn: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999, backgroundColor: brandGold.dark, marginTop: 8 },
  primaryBtnText: { color: '#0F0F0F', fontWeight: '700', fontSize: 15 },
  tertiaryBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  tertiaryBtnText: { color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  bracketsLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  bracketsBox: { width: '78%', aspectRatio: 0.72 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'flex-start' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  shutter: { width: 72, height: 72, borderRadius: 36, backgroundColor: brandGold.dark, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF' },
});
