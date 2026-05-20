import React, { memo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { useAndroidBitmapBootstrap } from '@/components/map/RestaurantMapMarker';

/**
 * Cluster bubble for the customer-facing map. Three size tiers per the
 * Seatly web app's `clusterIconSvg()` at
 * `apps/web/src/pages/customer/DiscoverPage.tsx:651-664`:
 *
 *   - 1-9 items   → 40px
 *   - 10-49 items → 48px
 *   - 50+ items   → 56px
 *
 * Visual: gold halo (rgba(201,168,76,0.16)) outer ring, gold inner circle
 * (#C9A84C) with black border (#0A0A0A) and the same drop shadow as the
 * regular pin. Count text is monospace #0A0907, 12px (13px in the 50+
 * tier), weight 700 — matches the web's `label` config.
 *
 * z-index per spec: 1000 + count, so a heavier cluster always renders
 * above lighter ones AND above selected pins (which sit at 999).
 */

type Props = {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  onPress: (id: string) => void;
};

const GOLD = '#C9A84C';
const BLACK = '#0A0A0A';
const HALO = 'rgba(201,168,76,0.16)';
const HALO_BORDER = 'rgba(245,230,200,0.35)';
const COUNT_COLOR = '#0a0907';

const monoFont = Platform.select({
  ios: 'Menlo',
  default: 'monospace',
});

function sizeForCount(count: number): number {
  if (count >= 50) return 56;
  if (count >= 10) return 48;
  return 40;
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    backgroundColor: HALO,
    borderWidth: 1.5,
    borderColor: HALO_BORDER,
  },
  inner: {
    backgroundColor: GOLD,
    borderWidth: 2,
    borderColor: BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 2.5,
    elevation: 6,
  },
  count: {
    color: COUNT_COLOR,
    fontFamily: monoFont,
    fontWeight: '700',
    includeFontPadding: false,
    textAlign: 'center',
  },
});

function RestaurantClusterMarkerComponent({
  id,
  latitude,
  longitude,
  count,
  onPress,
}: Props) {
  const size = sizeForCount(count);
  // Halo extends to the full size; inner circle is inset by 7px on each
  // side (matching web's `r = size/2 - 7`).
  const innerSize = Math.max(size - 14, 16);
  const fontSize = count >= 50 ? 13 : 12;

  // react-native-maps on Android snapshots a custom marker to a bitmap once
  // `tracksViewChanges` is false. If we set false from mount the snapshot is
  // captured before the gold halo / inner circle finish laying out, and the
  // cluster renders washed out (visible at /tmp/and-map-verify.png). The
  // shared hook keeps tracksViewChanges=true for ~600ms after mount on
  // Android so the snapshot captures the fully-rendered view, then drops to
  // false for perf. iOS composes directly and isn't affected.
  const tracksChanges = useAndroidBitmapBootstrap(false);

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      accessibilityLabel={`${count} restaurants nearby`}
      accessibilityHint="Shows the restaurants in this group"
      accessibilityRole="button"
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={1000 + count}
      onPress={() => onPress(id)}
      tracksViewChanges={tracksChanges}
    >
      <View style={[styles.wrap, { width: size, height: size }]}>
        <View
          style={[
            styles.halo,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        />
        <View
          style={[
            styles.inner,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            },
          ]}
        >
          <Text style={[styles.count, { fontSize, lineHeight: fontSize + 2 }]}>
            {count}
          </Text>
        </View>
      </View>
    </Marker>
  );
}

export const RestaurantClusterMarker = memo(RestaurantClusterMarkerComponent);
