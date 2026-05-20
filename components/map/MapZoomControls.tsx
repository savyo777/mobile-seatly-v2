import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius, createStyles, spacing } from '@/lib/theme';

/**
 * Floating +/- zoom buttons that mirror the web map's controls at
 * `apps/web/src/pages/customer/DiscoverPage.tsx` (the gold-bordered
 * round buttons top-right of the map canvas). Sits absolute top-right.
 * Caller wires `onZoomIn` / `onZoomOut` to its own `mapRef.animateCamera`
 * call. Disabling state is driven by `canZoomIn` / `canZoomOut` so the
 * caller can clamp at the current zoom bounds (4 ≤ z ≤ 18 in this app).
 */

type Props = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
  topOffset?: number;
};

const useStyles = createStyles((c) => ({
  wrap: {
    position: 'absolute',
    right: spacing.lg,
    zIndex: 30,
    elevation: 30,
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,15,15,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.4)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 6,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  glyph: {
    color: c.gold,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
    includeFontPadding: false,
  },
}));

export function MapZoomControls({
  onZoomIn,
  onZoomOut,
  canZoomIn = true,
  canZoomOut = true,
  topOffset,
}: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const top = topOffset ?? insets.top + spacing.sm;

  return (
    <View style={[styles.wrap, { top }]} pointerEvents="box-none">
      <Pressable
        onPress={onZoomIn}
        style={({ pressed }) => [styles.btn, (!canZoomIn || pressed) && styles.btnDisabled]}
        disabled={!canZoomIn}
        accessibilityRole="button"
        accessibilityLabel="Zoom in"
        hitSlop={8}
      >
        <Text style={styles.glyph}>+</Text>
      </Pressable>
      <Pressable
        onPress={onZoomOut}
        style={({ pressed }) => [styles.btn, (!canZoomOut || pressed) && styles.btnDisabled]}
        disabled={!canZoomOut}
        accessibilityRole="button"
        accessibilityLabel="Zoom out"
        hitSlop={8}
      >
        <Text style={styles.glyph}>−</Text>
      </Pressable>
    </View>
  );
}
