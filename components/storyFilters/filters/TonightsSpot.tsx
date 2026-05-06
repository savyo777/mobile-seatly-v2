import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import {
  FONT_BODY_SERIF_ITALIC,
  FONT_MONO,
} from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function TonightsSpot({ width, restaurantName }: StoryFilterProps) {
  const s = width / 224;
  const name = restaurantName?.trim() || "Tonight's Spot";
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Text style={[styles.star, { fontSize: 11 * s }]}>★</Text>
      <Text
        style={[styles.label, { left: 32 * s, fontSize: 12 * s }]}
        numberOfLines={1}
      >
        Tonight at {name}
      </Text>
      <Text style={[styles.time, { fontSize: 9 * s }]}>19:30 · CONFIRMED</Text>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  star: {
    position: 'absolute',
    left: 14,
    top: 14,
    color: '#c9a86a',
    textShadowColor: 'rgba(201,168,106,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  label: {
    position: 'absolute',
    top: 14,
    right: 14,
    fontFamily: FONT_BODY_SERIF_ITALIC,
    fontStyle: 'italic',
    fontWeight: '500',
    color: '#f0d49a',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  time: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    textAlign: 'center',
    fontFamily: FONT_MONO,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1.6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
