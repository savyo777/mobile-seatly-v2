import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import { FONT_BODY_SERIF_ITALIC } from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function HiddenGem({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.row, { gap: 5 * s }]}>
        <Text style={[styles.icon, { fontSize: 11 * s }]}>💎</Text>
        <Text style={[styles.text, { fontSize: 11 * s }]}>Hidden Gem</Text>
      </View>

      <StoryWatermark position="bl" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    textShadowColor: 'rgba(140,200,255,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  text: {
    fontFamily: FONT_BODY_SERIF_ITALIC,
    fontStyle: 'italic',
    fontWeight: '400',
    color: '#dfe9ff',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
