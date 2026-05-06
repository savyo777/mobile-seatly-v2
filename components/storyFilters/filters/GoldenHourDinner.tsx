/**
 * Golden Hour Dinner — warm amber edge vignette, italic gold
 * "Golden Hour Dinner" BL. Watermark TR.
 *
 * Reference: .f-gh::before, .f-gh .lbl
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import { FONT_BODY_SERIF_ITALIC } from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function GoldenHourDinner({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Edge-only amber vignette — never fills the centre */}
      <LinearGradient
        colors={['transparent', 'rgba(214,148,58,0.38)']}
        locations={[0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Text style={[styles.label, { fontSize: 11 * s }]}>Golden Hour Dinner</Text>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    fontFamily: FONT_BODY_SERIF_ITALIC,
    fontStyle: 'italic',
    fontWeight: '300',
    color: '#f0d49a',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
