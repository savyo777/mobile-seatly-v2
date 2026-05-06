/**
 * Main Character Meal — paper ticket with dashed border tilted -3deg in
 * the BL: mono caps eyebrow "scene 04 · take 1" + Caveat title.
 * Watermark TR.
 *
 * Reference: .f-main, .ticket, .ticket small, .ticket b
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import {
  FONT_MONO,
  FONT_SCRIPT_HANDWRITTEN,
} from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function MainCharacterMeal({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.ticket,
          {
            paddingHorizontal: 10 * s,
            paddingVertical: 8 * s,
            maxWidth: 170 * s,
            transform: [{ rotate: '-3deg' }],
          },
        ]}
      >
        <Text style={[styles.eyebrow, { fontSize: 8 * s }]}>SCENE 04 · TAKE 1</Text>
        <Text style={[styles.title, { fontSize: 18 * s }]}>main character meal</Text>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: {
    position: 'absolute',
    left: 12,
    bottom: 18,
    backgroundColor: 'rgba(245,241,236,0.95)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,0,0,0.3)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  eyebrow: {
    fontFamily: FONT_MONO,
    color: '#7a766f',
    letterSpacing: 1.6,
  },
  title: {
    fontFamily: FONT_SCRIPT_HANDWRITTEN,
    fontWeight: '600',
    color: '#0a0a0a',
    marginTop: 2,
  },
});
