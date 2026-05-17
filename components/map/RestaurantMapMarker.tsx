import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import { normalizeRestaurantPriceRange, restaurantPriceLabel } from '@/lib/restaurants/pricing';
import { createStyles, borderRadius, shadows } from '@/lib/theme';

type Props = {
  id: string;
  latitude: number;
  longitude: number;
  name?: string;
  rating: number;
  priceTier: number;
  selected: boolean;
  /**
   * Kept for backwards compatibility with callers. Both variants now
   * render the same unified UI — the dark rating/price pill on top,
   * the restaurant name label below — so the discover map and the
   * Hey Cenaiva map look identical.
   */
  variant?: 'default' | 'cenaiva';
  onPress: (id: string) => void;
};

type ContentProps = Pick<Props, 'name' | 'rating' | 'priceTier' | 'selected'>;

const PIN = 40;
// The marker frame is sized so the anchor (passed on the Marker
// element) can point at the centre of the pill, not the bottom of the
// name label. Pill ~34, gap 4, label ~16 → frame ~54. The Marker
// anchor uses (pillHalf + glowPadding) / frameHeight.
const FRAME_HEIGHT = 56;
const PIN_HEIGHT = 34;
export const MARKER_ANCHOR_Y = (PIN_HEIGHT / 2) / FRAME_HEIGHT;

function safeRating(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

const useStyles = createStyles((c) => ({
  wrap: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
  },
  glow: {
    position: 'absolute',
    top: 2,
    width: 52,
    height: PIN_HEIGHT,
    borderRadius: borderRadius.full,
    backgroundColor: 'transparent',
    opacity: 0,
  },
  glowSelected: {
    opacity: 1,
    backgroundColor: 'rgba(201, 168, 76, 0.22)',
    ...shadows.goldGlow,
  },
  pin: {
    minWidth: PIN + 4,
    height: PIN_HEIGHT,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: 1.5,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    ...shadows.card,
  },
  pinSelected: {
    backgroundColor: c.gold,
    borderColor: c.gold,
    transform: [{ scale: 1.08 }],
  },
  nameLabel: {
    maxWidth: 120,
    minHeight: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(7,7,7,0.78)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  nameLabelSelected: {
    borderColor: 'rgba(201, 168, 76, 0.70)',
    backgroundColor: 'rgba(15,15,15,0.88)',
  },
  nameLabelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: c.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  ratingTextSelected: {
    color: c.bgBase,
  },
  dot: {
    marginHorizontal: 5,
    color: c.textMuted,
    fontSize: 11,
  },
  dotSelected: {
    color: '#1f1f1f',
  },
  priceText: {
    color: c.gold,
    fontSize: 11,
    fontWeight: '700',
  },
  priceTextSelected: {
    color: c.bgBase,
  },
  gap: {
    width: 3,
  },
  starGlyph: {
    fontSize: 11,
    lineHeight: 13,
    color: c.gold,
    fontWeight: '700',
  },
  starGlyphSelected: {
    color: c.bgBase,
  },
}));

export function RestaurantMapMarkerContent({
  name,
  rating,
  priceTier,
  selected,
}: ContentProps) {
  const styles = useStyles();
  const displayRating = safeRating(rating);
  const displayPriceTier = normalizeRestaurantPriceRange(priceTier);
  const displayPriceLabel = restaurantPriceLabel(displayPriceTier);

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={[styles.glow, selected && styles.glowSelected]} />
      <View style={[styles.pin, selected && styles.pinSelected]}>
        <View style={styles.contentRow}>
          <Text style={[styles.starGlyph, selected && styles.starGlyphSelected]} accessible={false}>
            ★
          </Text>
          <View style={styles.gap} />
          <Text style={[styles.ratingText, selected && styles.ratingTextSelected]}>{displayRating.toFixed(1)}</Text>
          <Text style={[styles.dot, selected && styles.dotSelected]}>•</Text>
          <Text style={[styles.priceText, selected && styles.priceTextSelected]}>{displayPriceLabel}</Text>
        </View>
      </View>
      {name ? (
        <View style={[styles.nameLabel, selected && styles.nameLabelSelected]}>
          <Text style={styles.nameLabelText} numberOfLines={1} ellipsizeMode="tail">
            {name}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function RestaurantMapMarkerComponent({
  id,
  latitude,
  longitude,
  name,
  rating,
  priceTier,
  selected,
  onPress,
}: Props) {
  const displayRating = safeRating(rating);
  const displayPriceLabel = restaurantPriceLabel(priceTier);

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      accessibilityLabel={`${name ?? 'Restaurant'}, ${displayRating.toFixed(1)} rating · ${displayPriceLabel}`}
      accessibilityRole="button"
      anchor={{ x: 0.5, y: MARKER_ANCHOR_Y }}
      zIndex={selected ? 1000 : 1}
      onPress={() => onPress(id)}
      tracksViewChanges={selected}
    >
      <RestaurantMapMarkerContent
        name={name}
        rating={rating}
        priceTier={priceTier}
        selected={selected}
      />
    </Marker>
  );
}

export const RestaurantMapMarker = memo(RestaurantMapMarkerComponent);
