import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import { useColors, createStyles, borderRadius, shadows } from '@/lib/theme';

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

const PIN = 40;

const useStyles = createStyles((c) => ({
  wrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
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
    minWidth: 74,
    maxWidth: 164,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  cenaivaPinSelected: {
    backgroundColor: '#C8A951',
    borderColor: '#A68B3E',
    transform: [{ scale: 1.1 }],
  },
  cenaivaName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 15,
    maxWidth: 140,
  },
  cenaivaNameSelected: {
    color: '#000000',
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
  const styles = useStyles();
  const isCenaiva = variant === 'cenaiva';

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      anchor={{ x: 0.5, y: 1 }}
      zIndex={selected ? 1000 : 1}
      onPress={() => onPress(id)}
      tracksViewChanges={selected}
    >
      <View style={styles.wrap} pointerEvents="box-none">
        <View style={[styles.glow, selected && styles.glowSelected]} />
        {isCenaiva ? (
          <View style={[styles.cenaivaPin, selected && styles.cenaivaPinSelected]}>
            <Text
              style={[styles.cenaivaName, selected && styles.cenaivaNameSelected]}
              numberOfLines={1}
            >
              {name ?? 'Restaurant'}
            </Text>
          </View>
        ) : (
          <View style={[styles.pin, selected && styles.pinSelected]}>
            <View style={styles.contentRow}>
              <Text style={[styles.starGlyph, selected && styles.starGlyphSelected]} accessible={false}>
                ★
              </Text>
              <View style={styles.gap} />
              <Text style={[styles.ratingText, selected && styles.ratingTextSelected]}>{rating.toFixed(1)}</Text>
              <Text style={[styles.dot, selected && styles.dotSelected]}>•</Text>
              <Text style={[styles.priceText, selected && styles.priceTextSelected]}>{'$'.repeat(Math.max(1, Math.min(4, priceTier)))}</Text>
            </View>
          </View>
        )}
      </View>
    </Marker>
  );
}

export const RestaurantMapMarker = memo(RestaurantMapMarkerComponent);
