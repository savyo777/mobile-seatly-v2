/**
 * Pretty Food Only — pink frosted pill TC "pretty food only" + 2 hearts.
 * Watermark BL (per reference).
 *
 * Reference: .f-pretty, .pill, .heart, .heart.h2
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Heart } from '@/components/storyFilters/glyphs';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import { FONT_BODY_SERIF_ITALIC } from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function PrettyFoodOnly({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.pill,
          { paddingHorizontal: 12 * s, paddingVertical: 5 * s },
        ]}
      >
        <Text style={[styles.pillText, { fontSize: 11 * s }]}>pretty food only</Text>
      </View>

      <View style={[styles.heart, { top: '50%', left: '14%' }]}>
        <Heart size={11 * s} fill="#f4b6c2" />
      </View>
      <View style={[styles.heart, { top: '70%', right: '12%' }]}>
        <Heart size={8 * s} fill="#f4b6c2" />
      </View>

      <StoryWatermark position="bl" />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(244,182,194,0.92)',
    borderRadius: 999,
  },
  pillText: {
    fontFamily: FONT_BODY_SERIF_ITALIC,
    fontWeight: '600',
    fontStyle: 'italic',
    color: '#5a1224',
    letterSpacing: 0.5,
  },
  heart: { position: 'absolute' },
});
