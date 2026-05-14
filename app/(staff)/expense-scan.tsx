import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import DocumentScanner, {
  ResponseType,
  ScanDocumentResponseStatus,
} from 'react-native-document-scanner-plugin';
import { setPendingScan } from '@/lib/expenses/pendingScan';
import { brandGold } from '@/lib/theme/tokens';

export default function ExpenseScanScreen() {
  const router = useRouter();
  const launched = useRef(false);

  useEffect(() => {
    if (launched.current) return;
    launched.current = true;

    let cancelled = false;

    (async () => {
      try {
        const result = await DocumentScanner.scanDocument({
          maxNumDocuments: 1,
          croppedImageQuality: 70,
          responseType: ResponseType.ImageFilePath,
        });

        if (cancelled) return;

        const uri = result.scannedImages?.[0];
        if (result.status !== ScanDocumentResponseStatus.Success || !uri) {
          router.back();
          return;
        }

        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
        });

        if (cancelled) return;

        setPendingScan({
          uri,
          base64,
          mimeType: 'image/jpeg',
          source: 'camera',
        });
        router.replace('/(staff)/expense-review');
      } catch {
        if (!cancelled) router.back();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ActivityIndicator color={brandGold.dark} />
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
});
