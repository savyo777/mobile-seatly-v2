import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CornerBrackets } from '@/components/owner/CornerBrackets';
import { setPendingScan } from '@/lib/expenses/pendingScan';
import { brandGold, withAlpha } from '@/lib/theme/tokens';

export default function ExpenseScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleCapture = useCallback(async () => {
    if (capturing) return;
    setCapturing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const camera = cameraRef.current;
      if (!camera) return;
      const photo = await camera.takePictureAsync({
        base64: true,
        quality: 0.7,
        skipProcessing: false,
      });
      if (!photo?.base64 || !photo?.uri) {
        setCapturing(false);
        return;
      }
      setPendingScan({
        uri: photo.uri,
        base64: photo.base64,
        mimeType: 'image/jpeg',
      });
      router.replace('/(staff)/expense-review');
    } catch {
      setCapturing(false);
    }
  }, [capturing, router]);

  const handlePickFromLibrary = useCallback(async () => {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!lib.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (!asset.base64 || !asset.uri) return;
    setPendingScan({
      uri: asset.uri,
      base64: asset.base64,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
    router.replace('/(staff)/expense-review');
  }, [router]);

  if (!permission) {
    return <View style={styles.root} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.root}>
        <View style={[styles.permissionWrap, { paddingTop: insets.top + 32 }]}>
          <Ionicons name="camera-outline" size={48} color={brandGold.dark} />
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionBody}>
            Cenaiva needs camera access to scan paper receipts. Your photos stay private to your restaurant.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => void requestPermission()}>
            <Text style={styles.primaryButtonText}>Grant access</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={handleClose}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <CameraView ref={cameraRef} style={styles.cameraFill} facing="back" />

      {/* Pulsing gold corner brackets — the precision-instrument framing */}
      <View pointerEvents="none" style={styles.bracketsLayer}>
        <View style={styles.bracketsBox}>
          <CornerBrackets style={StyleSheet.absoluteFill} length={28} thickness={2} pulse />
        </View>
      </View>

      {/* Top chrome */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.glassButton} onPress={handleClose} hitSlop={8}>
          <Ionicons name="close" size={20} color="#fff" />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.titleHint}>Frame the whole receipt</Text>
        </View>
        <View style={styles.glassButton} />
      </View>

      {/* Bottom chrome */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']}
        style={styles.bottomGradient}
      />
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable style={styles.sideButton} onPress={handlePickFromLibrary} hitSlop={8}>
          <Ionicons name="images-outline" size={22} color="#fff" />
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
    aspectRatio: 0.62, // tall like a receipt
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
  permissionWrap: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
  },
  permissionBody: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
    backgroundColor: brandGold.dark,
  },
  primaryButtonText: {
    color: '#0F0F0F',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
  },
});
