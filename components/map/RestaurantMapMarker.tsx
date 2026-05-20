import React, { memo, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { normalizeRestaurantPriceRange } from '@/lib/restaurants/pricing';

/**
 * Returns true for the first ~600ms after mount on Android, then mirrors
 * `selected`. Works around react-native-maps' Android-only "snapshot the
 * custom marker view to a bitmap once `tracksViewChanges` is false"
 * behavior — when that snapshot runs before layout completes, the gold
 * pill / cluster renders washed out and missing its shadow. iOS composes
 * the React tree directly so the bootstrap window is a no-op there.
 */
export function useAndroidBitmapBootstrap(selected: boolean): boolean {
  const [bootstrap, setBootstrap] = useState(Platform.OS === 'android');
  useEffect(() => {
    if (!bootstrap) return undefined;
    const t = setTimeout(() => setBootstrap(false), 600);
    return () => clearTimeout(t);
  }, [bootstrap]);
  return bootstrap || selected;
}

/**
 * Restaurant pin that matches the Seatly web app's pinIconSvg() pattern at
 * `apps/web/src/pages/customer/DiscoverPage.tsx:597-650` of the
 * https://github.com/StevenGeorgy/Seatly repo. Two variants:
 *
 *   - No price tier → solid gold circle (22px idle / 28px active).
 *   - Price tier 1/2/3 → $/$$/$$$ pill, dark idle / light-gold active.
 *
 * Rating + name + cuisine intentionally don't render here — those live in
 * the popup card (MapRestaurantPopup, Tier 5). The web map is much sparser
 * than the previous mobile pill, which is the point: pixel-equivalent
 * visual parity with /discover.
 */

type Props = {
  id: string;
  latitude: number;
  longitude: number;
  name?: string;
  /**
   * Kept for backwards compatibility with callers. Rating is no longer
   * rendered on the marker — it shows in the popup card on tap.
   */
  rating?: number;
  priceTier: number;
  selected: boolean;
  variant?: 'default' | 'cenaiva';
  onPress: (id: string) => void;
};

// Brand hex tokens (mirror MOBILE_MAPS_GUIDE.md Section 9 — use #C9A84C
// not #D4AF37; #F5E6C8 is the active/highlight gold).
const GOLD = '#C9A84C';
const GOLD_LIGHT = '#F5E6C8';
const BLACK = '#0A0A0A';
const BLACK_BORDER_IDLE = 'rgba(10,10,10,0.6)';
const GOLD_BORDER_IDLE = 'rgba(201,168,76,0.65)';

// Pin sizes (px) — match web's pinIconSvg.
const CIRCLE_IDLE = 22;
const CIRCLE_ACTIVE = 28;
const PILL_HEIGHT_IDLE = 22;
const PILL_HEIGHT_ACTIVE = 28;

// Marker anchor: centered (web anchors at size/2, size/2).
export const MARKER_ANCHOR_Y = 0.5;

const monoFont = Platform.select({
  ios: 'Menlo',
  default: 'monospace',
});

const styles = StyleSheet.create({
  // Circle: no price level
  circleIdle: {
    width: CIRCLE_IDLE,
    height: CIRCLE_IDLE,
    borderRadius: CIRCLE_IDLE / 2,
    backgroundColor: GOLD,
    borderWidth: 1.25,
    borderColor: BLACK_BORDER_IDLE,
    // Drop shadow — matches feDropShadow dx=0 dy=2 stdDeviation=2 #000 0.55
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 2,
    elevation: 4,
  },
  circleActive: {
    width: CIRCLE_ACTIVE,
    height: CIRCLE_ACTIVE,
    borderRadius: CIRCLE_ACTIVE / 2,
    backgroundColor: GOLD_LIGHT,
    borderWidth: 2,
    borderColor: BLACK,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 2,
    elevation: 4,
  },
  // Pill: priceLevel 1/2/3
  pillIdle: {
    height: PILL_HEIGHT_IDLE,
    borderRadius: PILL_HEIGHT_IDLE / 2,
    backgroundColor: BLACK,
    borderWidth: 1.25,
    borderColor: GOLD_BORDER_IDLE,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 2,
    elevation: 4,
  },
  pillActive: {
    height: PILL_HEIGHT_ACTIVE,
    borderRadius: PILL_HEIGHT_ACTIVE / 2,
    backgroundColor: GOLD_LIGHT,
    borderWidth: 2,
    borderColor: GOLD,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 2,
    elevation: 4,
  },
  pillTextIdle: {
    color: GOLD,
    fontFamily: monoFont,
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 14,
    textAlign: 'center',
    includeFontPadding: false,
  },
  pillTextActive: {
    color: BLACK,
    fontFamily: monoFont,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 16,
    textAlign: 'center',
    includeFontPadding: false,
  },
});

function dollarsForTier(tier: number): string | null {
  const normalized = normalizeRestaurantPriceRange(tier);
  if (normalized < 1 || normalized > 3) return null;
  return '$'.repeat(normalized);
}

type ContentProps = {
  priceTier: number;
  selected: boolean;
};

export function RestaurantMapMarkerContent({ priceTier, selected }: ContentProps) {
  const dollars = dollarsForTier(priceTier);

  if (dollars) {
    return (
      <View style={selected ? styles.pillActive : styles.pillIdle}>
        <Text style={selected ? styles.pillTextActive : styles.pillTextIdle}>{dollars}</Text>
      </View>
    );
  }

  return <View style={selected ? styles.circleActive : styles.circleIdle} />;
}

function RestaurantMapMarkerComponent({
  id,
  latitude,
  longitude,
  name,
  priceTier,
  selected,
  onPress,
}: Props) {
  const dollars = dollarsForTier(priceTier);
  const a11y = dollars
    ? `${name ?? 'Restaurant'}, price ${dollars}`
    : (name ?? 'Restaurant');
  const tracks = useAndroidBitmapBootstrap(selected);

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      accessibilityLabel={a11y}
      accessibilityRole="button"
      anchor={{ x: 0.5, y: MARKER_ANCHOR_Y }}
      zIndex={selected ? 999 : 1}
      onPress={() => onPress(id)}
      tracksViewChanges={tracks}
    >
      <RestaurantMapMarkerContent priceTier={priceTier} selected={selected} />
    </Marker>
  );
}

export const RestaurantMapMarker = memo(RestaurantMapMarkerComponent);
