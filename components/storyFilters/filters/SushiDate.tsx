import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  ChopsticksGlyph,
  Heart,
  SushiGlyph,
} from '@/components/storyFilters/glyphs';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import { FONT_BODY_SERIF_ITALIC } from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function SushiDate({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.sushi}>
        <SushiGlyph size={24 * s} />
      </View>
      <View style={styles.chopsticks}>
        <ChopsticksGlyph size={18 * s} />
      </View>
      <View style={styles.heart}>
        <Heart size={9 * s} fill="#f4b6c2" />
      </View>

      <View style={styles.label}>
        <Text style={[styles.title, { fontSize: 13 * s }]}>— sushi date —</Text>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  sushi: {
    position: 'absolute',
    top: 14,
    left: 14,
  },
  chopsticks: {
    position: 'absolute',
    top: 18,
    right: 18,
    transform: [{ rotate: '10deg' }],
  },
  heart: {
    position: 'absolute',
    top: '50%',
    left: '75%',
  },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: 'center',
  },
  title: {
    fontFamily: FONT_BODY_SERIF_ITALIC,
    fontStyle: 'italic',
    fontWeight: '500',
    color: '#ffd6e0',
    letterSpacing: 0.7,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
