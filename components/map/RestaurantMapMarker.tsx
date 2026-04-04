import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { colors, borderRadius, shadows } from '@/lib/theme';

type Props = {
  id: string;
  latitude: number;
  longitude: number;
  rating: number;
  priceTier: number;
  selected: boolean;
  onPress: (id: string) => void;
};

function RestaurantMapMarkerComponent({
  id,
  latitude,
  longitude,
  rating,
  priceTier,
  selected,
  onPress,
}: Props) {
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
      </View>
    </Marker>
  );
}

export const RestaurantMapMarker = memo(RestaurantMapMarkerComponent);

const PIN = 40;

const styles = StyleSheet.create({
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
    backgroundColor: colors.bgElevated,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    ...shadows.card,
  },
  pinSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    transform: [{ scale: 1.08 }],
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  ratingTextSelected: {
    color: colors.bgBase,
  },
  dot: {
    marginHorizontal: 5,
    color: colors.textMuted,
    fontSize: 11,
  },
  dotSelected: {
    color: '#1f1f1f',
  },
  priceText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
  },
  priceTextSelected: {
    color: colors.bgBase,
  },
  gap: {
    width: 3,
  },
  starGlyph: {
    fontSize: 11,
    lineHeight: 13,
    color: colors.gold,
    fontWeight: '700',
  },
  starGlyphSelected: {
    color: colors.bgBase,
  },
});
