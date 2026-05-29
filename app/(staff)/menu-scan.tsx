import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { createStyles } from '@/lib/theme';
import { ownerColorsFromPalette, ownerRadii, ownerSpace, useOwnerColors } from '@/lib/theme/ownerTheme';
import { setPendingMenuScan } from '@/lib/menu/pendingMenuScan';
import { friendlyError } from '@/lib/errors/friendlyError';

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

function mimeFromName(name: string | null | undefined): string {
  if (!name) return 'image/jpeg';
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.heif')) return 'image/heif';
  return 'image/jpeg';
}

export default function MenuScanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const ownerColors = useOwnerColors();
  const styles = useStyles();
  const [loadingFile, setLoadingFile] = useState(false);

  const handleCamera = useCallback(() => {
    router.push('/(staff)/menu-scan-camera' as never);
  }, [router]);

  const handleLibrary = useCallback(async () => {
    if (loadingFile) return;
    setLoadingFile(true);
    try {
      const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!p.granted) {
        Alert.alert(t('common.error'), friendlyError(undefined, t('owner.menuScanLibraryPermission')));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (!asset.base64) return;
      const inferredMime = asset.mimeType ?? mimeFromName(asset.fileName);
      setPendingMenuScan({
        uri: asset.uri,
        base64: asset.base64,
        mimeType: inferredMime,
        source: 'library',
        fileName: asset.fileName ?? undefined,
      });
      router.push('/(staff)/menu-scan-review' as never);
    } catch (err) {
      if (__DEV__) console.warn('[menu-scan] library pick failed', err);
    } finally {
      setLoadingFile(false);
    }
  }, [loadingFile, router, t]);

  const handleFile = useCallback(async () => {
    if (loadingFile) return;
    setLoadingFile(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_IMAGE_MIMES,
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const mime = asset.mimeType ?? mimeFromName(asset.name);
      if (!ALLOWED_IMAGE_MIMES.includes(mime.toLowerCase())) {
        Alert.alert(t('common.error'), friendlyError(undefined, t('owner.menuScanFileNotImage')));
        return;
      }
      // expo-document-picker doesn't return base64 directly — read the
      // file we just copied to the cache directory.
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (!base64) return;
      setPendingMenuScan({
        uri: asset.uri,
        base64,
        mimeType: mime,
        source: 'file',
        fileName: asset.name,
      });
      router.push('/(staff)/menu-scan-review' as never);
    } catch (err) {
      if (__DEV__) console.warn('[menu-scan] file pick failed', err);
    } finally {
      setLoadingFile(false);
    }
  }, [loadingFile, router, t]);

  const handleManual = useCallback(() => {
    router.push('/(staff)/menu-item-edit' as never);
  }, [router]);

  return (
    <OwnerScreen
      header={<SubpageHeader title={t('owner.menuScanTitle')} fallbackTab="menu" />}
    >
      <View style={styles.body}>
        <Text style={styles.subtitle}>{t('owner.menuScanSubtitle')}</Text>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={handleCamera}
          disabled={loadingFile}
        >
          <View style={[styles.cardIcon, { backgroundColor: 'rgba(201,168,76,0.16)' }]}>
            <Ionicons name="camera-outline" size={24} color={ownerColors.gold} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{t('owner.menuScanSourceCamera')}</Text>
            <Text style={styles.cardSub}>{t('owner.menuScanSourceCameraSub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={ownerColors.textMuted} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={handleLibrary}
          disabled={loadingFile}
        >
          <View style={[styles.cardIcon, { backgroundColor: 'rgba(201,168,76,0.16)' }]}>
            <Ionicons name="images-outline" size={24} color={ownerColors.gold} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{t('owner.menuScanSourceLibrary')}</Text>
            <Text style={styles.cardSub}>{t('owner.menuScanSourceLibrarySub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={ownerColors.textMuted} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={handleFile}
          disabled={loadingFile}
        >
          <View style={[styles.cardIcon, { backgroundColor: 'rgba(201,168,76,0.16)' }]}>
            <Ionicons name="document-outline" size={24} color={ownerColors.gold} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{t('owner.menuScanSourceFile')}</Text>
            <Text style={styles.cardSub}>{t('owner.menuScanSourceFileSub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={ownerColors.textMuted} />
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          style={({ pressed }) => [styles.cardSecondary, pressed && styles.cardPressed]}
          onPress={handleManual}
          disabled={loadingFile}
        >
          <View style={[styles.cardIcon, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
            <Ionicons name="create-outline" size={24} color={ownerColors.text} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{t('owner.menuScanSourceManual')}</Text>
            <Text style={styles.cardSub}>{t('owner.menuScanSourceManualSub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={ownerColors.textMuted} />
        </Pressable>
      </View>
    </OwnerScreen>
  );
}

const useStyles = createStyles((c) => {
  const ownerColors = ownerColorsFromPalette(c);
  return {
    body: {
      paddingHorizontal: ownerSpace.md,
      paddingTop: ownerSpace.sm,
      gap: ownerSpace.sm,
    },
    subtitle: {
      color: ownerColors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: ownerSpace.sm,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: ownerSpace.md,
      padding: ownerSpace.md,
      borderRadius: ownerRadii.xl,
      backgroundColor: ownerColors.bgElevated,
      borderWidth: 1,
      borderColor: ownerColors.border,
    },
    cardSecondary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: ownerSpace.md,
      padding: ownerSpace.md,
      borderRadius: ownerRadii.xl,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: ownerColors.border,
    },
    cardPressed: {
      opacity: 0.78,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: {
      flex: 1,
    },
    cardTitle: {
      color: ownerColors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    cardSub: {
      color: ownerColors.textSecondary,
      fontSize: 13,
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: ownerColors.border,
      marginVertical: ownerSpace.sm,
    },
  } as const;
});
