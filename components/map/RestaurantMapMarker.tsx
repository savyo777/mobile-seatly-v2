import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import { createStyles, borderRadius, shadows } from '@/lib/theme';

type Props = {
  id: string;
  latitude: number;
  longitude: number;
  name?: string;
  rating: number;
  priceTier: number;
  selected: boolean;
  variant?: 'default' | 'cenaiva';
  onPress: (id: string) => void;
};

type ContentProps = Pick<Props, 'name' | 'rating' | 'priceTier' | 'selected' | 'variant'>;

const PIN = 40;
const CENAIVA_FRAME_WIDTH = 96;
const CENAIVA_FRAME_HEIGHT = 78;
const CENAIVA_PIN_STAGE = 56;
const CENAIVA_ANCHOR_Y = (CENAIVA_PIN_STAGE / 2) / CENAIVA_FRAME_HEIGHT;

function safeRating(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function safePriceTier(value: number): number {
  return Math.max(1, Math.min(4, Number.isFinite(value) ? value : 1));
}

const useStyles = createStyles((c) => ({
  wrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cenaivaFrame: {
    width: CENAIVA_FRAME_WIDTH,
    height: CENAIVA_FRAME_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  glow: {
    position: 'absolute',
    bottom: 4,
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    backgroundColor: 'transparent',
    opacity: 0,
  },
  glowSelected: {
    opacity: 1,
    backgroundColor: 'rgba(201, 168, 76, 0.22)',
    ...shadows.goldGlow,
  },
  cenaivaPinStage: {
    width: CENAIVA_PIN_STAGE,
    height: CENAIVA_PIN_STAGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cenaivaGlow: {
    position: 'absolute',
    left: 2,
    top: 2,
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    backgroundColor: 'transparent',
    opacity: 0,
  },
  pin: {
    minWidth: PIN + 4,
    height: 34,
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
  cenaivaPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#C8A951',
    borderWidth: 2,
    borderColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.34,
    shadowRadius: 9,
    elevation: 6,
  },
  cenaivaPinSelected: {
    borderColor: '#FFFFFF',
    backgroundColor: '#D8BA5A',
  },
  cenaivaPinInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0A0A0A',
  },
  cenaivaLabel: {
    maxWidth: 92,
    minHeight: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(7,7,7,0.72)',
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  cenaivaLabelSelected: {
    borderColor: 'rgba(216,186,90,0.70)',
    backgroundColor: 'rgba(15,15,15,0.84)',
  },
  cenaivaLabelText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
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
  variant = 'default',
}: ContentProps) {
  const styles = useStyles();
  const isCenaiva = variant === 'cenaiva';
  const displayRating = safeRating(rating);
  const displayPriceTier = safePriceTier(priceTier);

  if (isCenaiva) {
    return (
      <View style={styles.cenaivaFrame} pointerEvents="none">
        <View style={styles.cenaivaPinStage}>
          <View style={[styles.cenaivaGlow, selected && styles.glowSelected]} />
          <View style={[styles.cenaivaPin, selected && styles.cenaivaPinSelected]}>
            <View style={styles.cenaivaPinInner} />
          </View>
        </View>
        <View style={[styles.cenaivaLabel, selected && styles.cenaivaLabelSelected]}>
          <Text style={styles.cenaivaLabelText} numberOfLines={1} ellipsizeMode="tail">
            {name ?? 'Restaurant'}
          </Text>
        </View>
      </View>
    );
  }

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
          <Text style={[styles.priceText, selected && styles.priceTextSelected]}>{'$'.repeat(displayPriceTier)}</Text>
        </View>
      </View>
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
  variant = 'default',
  onPress,
}: Props) {
  const isCenaiva = variant === 'cenaiva';
  const displayRating = safeRating(rating);
  const displayPriceTier = safePriceTier(priceTier);

  if (isCenaiva) {
    return (
      <Marker
        coordinate={{ latitude, longitude }}
        accessibilityLabel={`${name ?? 'Restaurant'}, ${displayRating.toFixed(1)} rating · ${'$'.repeat(displayPriceTier)}`}
        accessibilityHint="Shows restaurant catalog"
        accessibilityRole="button"
        anchor={{ x: 0.5, y: CENAIVA_ANCHOR_Y }}
        zIndex={selected ? 1000 : 1}
        onPress={() => onPress(id)}
        tracksViewChanges={selected}
      >
        <RestaurantMapMarkerContent
          name={name}
          rating={rating}
          priceTier={priceTier}
          selected={selected}
          variant={variant}
        />
      </Marker>
    );
  }

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      anchor={{ x: 0.5, y: 1 }}
      zIndex={selected ? 1000 : 1}
      onPress={() => onPress(id)}
      tracksViewChanges={selected}
    >
      <RestaurantMapMarkerContent
        name={name}
        rating={rating}
        priceTier={priceTier}
        selected={selected}
        variant={variant}
      />
    </Marker>
  );
}

export const RestaurantMapMarker = memo(RestaurantMapMarkerComponent);
