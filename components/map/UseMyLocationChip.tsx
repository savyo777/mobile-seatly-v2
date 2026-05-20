import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius, createStyles, spacing, typography } from '@/lib/theme';

/**
 * Top-left "Relocate" pill that mirrors the web map's
 * locate-me affordance at `apps/web/src/pages/customer/DiscoverPage.tsx`.
 * Tapping fires `onLocate(coords)` so the caller can pan/zoom its own
 * MapView. On first tap (no permission yet), requests foreground
 * permission via expo-location; on deny, renders a subtle banner
 * underneath that opens system settings on tap.
 *
 * `cachedLocation` lets the caller hand in a location it already
 * resolved via its own `useLocation` hook (the common case — the
 * map's parent already had to fetch the user's coords to render the
 * blue dot). When present, every tap fires `onLocate(cachedLocation)`
 * immediately, side-stepping the slow `getCurrentPositionAsync` path
 * (which the simulator returns nothing for, leading to no visible
 * pan). When absent or permission isn't granted yet, we fall through
 * to the in-chip request + fetch.
 *
 * Label is "Relocate" in every state except denied (where it becomes
 * "Location off" + tap-to-open-settings). Previous wording ("Find near me"
 * / "Use my location") leaked the permission state into the chip, which
 * read as inconsistent across taps.
 */

type Props = {
  onLocate: (coords: { latitude: number; longitude: number }) => void;
  cachedLocation?: { latitude: number; longitude: number } | null;
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

export function UseMyLocationChip({ onLocate, cachedLocation, topOffset }: Props) {
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

    // Fast path: the parent already resolved a live user location via its
    // own useLocation hook. Use that and skip getCurrentPositionAsync,
    // which is slow and silently no-ops on the iOS simulator unless
    // someone set a custom location via `xcrun simctl location`.
    if (cachedLocation) {
      onLocate(cachedLocation);
      if (status === 'idle') {
        // Permission may not have been asked yet on this app launch;
        // request it in the background so a future tap-without-cache
        // doesn't strand the user on the in-chip permission prompt.
        const perm = await Location.requestForegroundPermissionsAsync();
        setStatus(perm.status === 'granted' ? 'granted' : 'denied');
      }
      return;
    }

    // Slow path: no cached location. Request permission, then fetch fresh
    // coords, then pan. Hit when the parent hasn't run useLocation yet
    // or when its fetch failed/was denied.
    setStatus('requesting');
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') {
      setStatus('denied');
      return;
    }
    setStatus('granted');
    // Try the OS's last-known position first (returns instantly when the OS
    // has a recent fix), then fall back to a fresh fix. Both can return null
    // on emulators / first-launch / location-services-off.
    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        onLocate({ latitude: last.coords.latitude, longitude: last.coords.longitude });
        return;
      }
    } catch {
      // ignore — fall through to current-position
    }
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      onLocate({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch {
      // Position unavailable (sim with no location set, or fix timed out).
      // The granted UI stays; nothing else to do without a real coordinate.
    }
  }, [status, onLocate, cachedLocation]);

  const label = status === 'denied' ? 'Location off' : 'Relocate';

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
