import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { CornerBrackets } from '@/components/owner/CornerBrackets';
import { setPendingScan } from '@/lib/expenses/pendingScan';
import { brandGold, withAlpha } from '@/lib/theme/tokens';
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

export default function ExpenseScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);

  // Staff tabs keep this hidden route mounted. Reset the shutter whenever
  // the scanner becomes active again so it cannot return stuck loading.
  useFocusEffect(
    useCallback(() => {
      setCapturing(false);
    }, []),
  );

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleCapture = useCallback(async () => {
    if (capturing) return;
    const camera = cameraRef.current;
    if (!camera) {
      Alert.alert('Camera not ready', friendlyError(undefined, 'Give the camera a second to finish loading, then try again.'));
      return;
    }

    setCapturing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const photo = await withTimeout(
        camera.takePictureAsync({
          base64: true,
          quality: 0.7,
          skipProcessing: false,
        }),
        CAPTURE_TIMEOUT_MS,
      );
      if (!photo?.base64 || !photo?.uri) {
        Alert.alert('No photo captured', friendlyError(undefined, 'Try framing the receipt again.'));
        return;
      }
      setPendingScan({
        uri: photo.uri,
        base64: photo.base64,
        mimeType: 'image/jpeg',
        source: 'camera',
      });
      setCapturing(false);
      router.replace('/(staff)/expense-review');
    } catch (err) {
      if (__DEV__) console.warn('expense-scan: camera capture failed', err);
      Alert.alert('Camera did not finish', friendlyError(undefined, 'Try again, or enter the expense manually.'));
    } finally {
      setCapturing(false);
    }
  }, [capturing, router]);

  const handleManual = useCallback(() => {
    router.replace({ pathname: '/(staff)/expense-review', params: { mode: 'manual' } });
  }, [router]);

  const handleRequestPermission = useCallback(() => {
    if (permission && !permission.canAskAgain) {
      void Linking.openSettings();
      return;
    }
    void requestPermission();
  }, [permission, requestPermission]);

  if (!permission) {
    return (
      <View style={[styles.root, styles.centeredRoot, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
        <StatusBar style="light" />
        <ActivityIndicator color={brandGold.dark} />
        <Text style={styles.loadingText}>Opening camera...</Text>
        <Pressable style={styles.tertiaryBtn} onPress={handleClose}>
          <Text style={styles.tertiaryBtnText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.centeredRoot, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
        <StatusBar style="light" />
        <View style={styles.errorIconWrap}>
          <Ionicons name="camera-outline" size={36} color={brandGold.dark} />
        </View>
        <Text style={styles.errorTitle}>Camera access needed</Text>
        <Text style={styles.errorBody}>
          {permission.canAskAgain
            ? 'Cenaiva needs camera access to scan paper receipts. Your photos stay private to your restaurant.'
            : 'Camera access is disabled for Cenaiva. Open Settings, allow camera access, then come back to scan receipts.'}
        </Text>
        <Pressable style={styles.primaryBtn} onPress={handleRequestPermission}>
          <Ionicons name={permission.canAskAgain ? 'camera' : 'settings-outline'} size={16} color="#0F0F0F" />
          <Text style={styles.primaryBtnText}>{permission.canAskAgain ? 'Grant camera access' : 'Open Settings'}</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={handleManual}>
          <Ionicons name="create-outline" size={16} color={brandGold.dark} />
          <Text style={styles.secondaryBtnText}>Enter manually</Text>
        </Pressable>
        <Pressable style={styles.tertiaryBtn} onPress={handleClose}>
          <Text style={styles.tertiaryBtnText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <CameraView ref={cameraRef} style={styles.cameraFill} facing="back" />

      <View pointerEvents="none" style={styles.bracketsLayer}>
        <View style={styles.bracketsBox}>
          <CornerBrackets style={StyleSheet.absoluteFill} length={28} thickness={2} pulse />
        </View>
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.glassButton} onPress={handleClose} hitSlop={8}>
          <Ionicons name="close" size={20} color="#fff" />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.titleHint}>Frame the whole receipt</Text>
        </View>
        <View style={styles.glassButton} />
      </View>

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']}
        style={styles.bottomGradient}
      />
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable style={styles.sideButton} onPress={handleManual} hitSlop={8}>
          <Ionicons name="create-outline" size={22} color="#fff" />
        </Pressable>

        <Pressable
          style={styles.shutterRing}
          onPress={handleCapture}
          disabled={capturing}
          hitSlop={6}
        >
          <View style={styles.shutterInner}>
            {capturing ? <ActivityIndicator color={brandGold.dark} /> : null}
          </View>
        </Pressable>

        <View style={styles.sideButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  centeredRoot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraFill: {
    ...StyleSheet.absoluteFillObject,
  },
  bracketsLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bracketsBox: {
    width: '70%',
    aspectRatio: 0.62,
    maxWidth: 320,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  titleHint: {
    color: withAlpha('#FFFFFF', 0.85),
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  glassButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(60,60,60,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  sideButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(60,60,60,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    marginTop: 12,
  },
  errorIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(brandGold.dark, 0.12),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha(brandGold.dark, 0.32),
    marginBottom: 8,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  errorBody: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 340,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: brandGold.dark,
  },
  primaryBtnText: {
    color: '#0F0F0F',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha(brandGold.dark, 0.45),
  },
  secondaryBtnText: {
    color: brandGold.dark,
    fontWeight: '700',
    fontSize: 14,
  },
  tertiaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  tertiaryBtnText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontWeight: '600',
  },
});
