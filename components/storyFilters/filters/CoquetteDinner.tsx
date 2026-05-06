/**
 * Coquette Dinner — pearl row TC, pink ribbon below, two ♡ accents,
 * COQUETTE eyebrow + Cormorant italic "une belle soirée", watermark TR.
 *
 * Reference: .f-coquette, .pearls, .ribbon, .h1/.h2, .lbl
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pearl, Ribbon, Heart } from '@/components/storyFilters/glyphs';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import {
  FONT_BODY_SERIF_ITALIC,
  FONT_SANS,
} from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

const PEARL_COUNT = 7;

export function CoquetteDinner({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Pearl row across the top */}
      <View style={styles.pearlsRow}>
        {Array.from({ length: PEARL_COUNT }).map((_, i) => (
          <View key={i} style={{ marginHorizontal: 2 * s }}>
            <Pearl size={7 * s} />
          </View>
        ))}
      </View>

      {/* Ribbon below the pearls */}
      <View style={[styles.ribbon, { top: 36 * s }]}>
        <Ribbon width={60 * s} />
      </View>

      {/* Two tiny hearts at reference-style coordinates */}
      <View style={[styles.heart, { top: '22%', left: '14%' }]}>
        <Heart size={10 * s} fill="#f4b6c2" />
      </View>
      <View style={[styles.heart, { top: '60%', right: '18%' }]}>
        <Heart size={8 * s} fill="#f4b6c2" />
      </View>

      {/* Label */}
      <View style={styles.label}>
        <Text style={[styles.eyebrow, { fontSize: 8 * s }]}>COQUETTE</Text>
        <Text style={[styles.title, { fontSize: 13 * s }]}>une belle soirée</Text>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  pearlsRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  ribbon: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  heart: {
    position: 'absolute',
  },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 22,
    alignItems: 'center',
  },
  eyebrow: {
    fontFamily: FONT_SANS,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '300',
    letterSpacing: 4,
    marginBottom: 4,
  },
  title: {
    fontFamily: FONT_BODY_SERIF_ITALIC,
    fontStyle: 'italic',
    color: '#f0e6d2',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
