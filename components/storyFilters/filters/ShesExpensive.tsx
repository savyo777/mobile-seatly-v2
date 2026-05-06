/**
 * She's Expensive — Bodoni "$$$ · 24" price tag TL, black/gold pill bottom
 * with italic "she's expensive." Watermark TR.
 *
 * Reference: .f-expensive, .price, .badge
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import { FONT_DISPLAY_BODONI } from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

const GOLD = '#c9a86a';

export function ShesExpensive({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Text style={[styles.price, { fontSize: 14 * s }]}>$$$ · 24</Text>

      <View
        style={[
          styles.badge,
          {
            paddingHorizontal: 14 * s,
            paddingVertical: 6 * s,
            transform: [{ rotate: '-3deg' }],
          },
        ]}
      >
        <Text style={[styles.badgeText, { fontSize: 13 * s }]}>she's expensive.</Text>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  price: {
    position: 'absolute',
    top: 14,
    left: 14,
    fontFamily: FONT_DISPLAY_BODONI,
    fontStyle: 'italic',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  badge: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#0a0a0a',
    borderColor: GOLD,
    borderWidth: 1,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  badgeText: {
    fontFamily: FONT_DISPLAY_BODONI,
    fontWeight: '600',
    fontStyle: 'italic',
    color: GOLD,
    letterSpacing: 0.5,
  },
});
