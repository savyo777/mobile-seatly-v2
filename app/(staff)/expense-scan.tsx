import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import { setPendingScan } from '@/lib/expenses/pendingScan';
import { brandGold, withAlpha } from '@/lib/theme/tokens';

type ScannerModule = typeof import('react-native-document-scanner-plugin');

// The native document scanner ships as a TurboModule. If the dev client
// hasn't been rebuilt since the plugin was added, the JS-side require()
// throws — and an unhandled module-load error makes Expo Router treat
// this screen as missing, surfacing the generic "Unmatched Route" page
// (which is what the user was seeing). Loading the module lazily inside
// a try/catch keeps the route mountable so we can show a clear recovery
// message instead of a routing dead-end.
function tryLoadScanner(): ScannerModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-document-scanner-plugin') as ScannerModule;
  } catch {
    return null;
  }
}

type Status = 'launching' | 'unavailable' | 'error';

export default function ExpenseScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<Status>('launching');

  const runScan = useCallback(async () => {
    setStatus('launching');
    const mod = tryLoadScanner();
    if (!mod || !mod.default || typeof mod.default.scanDocument !== 'function') {
      setStatus('unavailable');
      return;
    }
    const DocumentScanner = mod.default;
    const ResponseType = mod.ResponseType;
    const ScanDocumentResponseStatus = mod.ScanDocumentResponseStatus;

    try {
      const result = await DocumentScanner.scanDocument({
        maxNumDocuments: 1,
        croppedImageQuality: 70,
        responseType: ResponseType.ImageFilePath,
      });

      const uri = result.scannedImages?.[0];
      if (result.status !== ScanDocumentResponseStatus.Success || !uri) {
        router.back();
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      setPendingScan({
        uri,
        base64,
        mimeType: 'image/jpeg',
        source: 'camera',
      });
      router.replace('/(staff)/expense-review');
    } catch (err) {
      // If the JS shim is present but the native side throws (e.g. user
      // denied camera, ML Kit init failure), surface a clear recovery
      // path rather than silently bouncing back.
      if (__DEV__) console.warn('expense-scan: scanDocument failed', err);
      setStatus('error');
    }
  }, [router]);

  // Re-launch the native scanner every time the screen comes into focus.
  // The (staff) tab navigator keeps screen instances mounted across
  // navigations, so a plain useEffect would only fire on the first
  // visit. useFocusEffect ensures each tap of the Camera CTA opens a
  // fresh scan session.
  useFocusEffect(
    useCallback(() => {
      void runScan();
    }, [runScan]),
  );

  const handleBack = useCallback(() => router.back(), [router]);
  const handleManual = useCallback(() => {
    router.replace({ pathname: '/(staff)/expense-review', params: { mode: 'manual' } });
  }, [router]);

  if (status === 'launching') {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <ActivityIndicator color={brandGold.dark} />
      </View>
    );
  }

  const isUnavailable = status === 'unavailable';

  return (
    <View style={[styles.root, styles.errorRoot, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="light" />
      <View style={styles.errorIconWrap}>
        <Ionicons
          name={isUnavailable ? 'construct-outline' : 'alert-circle-outline'}
          size={36}
          color={brandGold.dark}
        />
      </View>
      <Text style={styles.errorTitle}>
        {isUnavailable ? 'Scanner needs a rebuild' : 'Scan didn’t finish'}
      </Text>
      <Text style={styles.errorBody}>
        {isUnavailable
          ? 'The auto-capture document scanner uses a native module that isn’t in this build of the app yet. Install the latest dev build (eas build --profile development) and re-open Cenaiva, then try again.'
          : 'The camera couldn’t complete the scan. Try again, or log this expense by hand.'}
      </Text>

      {!isUnavailable ? (
        <Pressable style={styles.primaryBtn} onPress={runScan}>
          <Ionicons name="refresh" size={16} color="#0F0F0F" />
          <Text style={styles.primaryBtnText}>Try again</Text>
        </Pressable>
      ) : null}

      <Pressable style={styles.secondaryBtn} onPress={handleManual}>
        <Ionicons name="create-outline" size={16} color={brandGold.dark} />
        <Text style={styles.secondaryBtnText}>Enter manually</Text>
      </Pressable>

      <Pressable style={styles.tertiaryBtn} onPress={handleBack}>
        <Text style={styles.tertiaryBtnText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorRoot: {
    paddingHorizontal: 28,
    gap: 12,
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
