import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import { FONT_DISPLAY_BODONI } from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function DessertFirst({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.stamp,
          {
            paddingHorizontal: 10 * s,
            paddingVertical: 6 * s,
            transform: [{ rotate: '-3deg' }],
          },
        ]}
      >
        <Text style={[styles.stampText, { fontSize: 11 * s }]}>DESSERT FIRST</Text>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  stamp: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(244,182,194,0.85)',
    borderRadius: 4,
    backgroundColor: 'rgba(212,84,110,0.15)',
  },
  stampText: {
    fontFamily: FONT_DISPLAY_BODONI,
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#ffd6e0',
    letterSpacing: 0.7,
  },
});
