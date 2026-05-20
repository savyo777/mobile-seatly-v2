import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius, createStyles, spacing, typography } from '@/lib/theme';

/**
 * Top-left "Find near me" pill that mirrors the web map's
 * locate-me affordance at `apps/web/src/pages/customer/DiscoverPage.tsx`.
 * Tapping requests foreground location permission via expo-location
 * (already a project dep), and on grant fires `onLocate(coords)` so the
 * caller can pan/zoom its own MapView. On deny, renders a subtle banner
 * underneath that opens system settings on tap.
 *
 * Label switches:
 *   - permission unknown / not requested → "Find near me"
 *   - permission granted                 → "Use my location"
 *   - permission denied                  → "Location off" + tap-to-open-settings
 */

type Props = {
  onLocate: (coords: { latitude: number; longitude: number }) => void;
  topOffset?: number;
};

type Status = 'idle' | 'granted' | 'denied' | 'requesting';

const useStyles = createStyles((c) => ({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    zIndex: 30,
    elevation: 30,
    gap: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(15,15,15,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.4)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 6,
  },
  pillPressed: { opacity: 0.85 },
  label: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '700',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(120, 30, 30, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(180, 80, 80, 0.45)',
    alignSelf: 'flex-start',
    maxWidth: 220,
  },
  bannerText: {
    ...typography.bodySmall,
    color: '#F2D9D9',
    fontWeight: '600',
  },
}));

export function UseMyLocationChip({ onLocate, topOffset }: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const top = topOffset ?? insets.top + spacing.sm;
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    (async () => {
      const existing = await Location.getForegroundPermissionsAsync();
      if (existing.status === 'granted') setStatus('granted');
      else if (existing.status === 'denied') setStatus('denied');
    })();
  }, []);

  const handlePress = useCallback(async () => {
    if (status === 'denied') {
      Linking.openSettings();
      return;
    }
    setStatus('requesting');
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') {
      setStatus('denied');
      return;
    }
    setStatus('granted');
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      onLocate({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch {
      // Position unavailable (sim sometimes has no location set). Caller
      // can still get a permission-granted UI; they'll see no pan but
      // won't be left with a misleading "denied" state.
    }
  }, [status, onLocate]);

  const label =
    status === 'granted'
      ? 'Use my location'
      : status === 'denied'
        ? 'Location off'
        : 'Find near me';

  const iconName: keyof typeof Ionicons.glyphMap =
    status === 'granted' ? 'locate' : 'locate-outline';

  return (
    <View style={[styles.wrap, { top }]} pointerEvents="box-none">
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Ionicons name={iconName} size={16} color="#C9A84C" />
        <Text style={styles.label}>{label}</Text>
      </Pressable>
      {status === 'denied' ? (
        <View style={styles.banner}>
          <Ionicons name="alert-circle-outline" size={14} color="#F2D9D9" />
          <Text style={styles.bannerText}>Tap to turn on in Settings.</Text>
        </View>
      ) : null}
    </View>
  );
}
