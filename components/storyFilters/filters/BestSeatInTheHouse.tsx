import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import { FONT_BODY_SERIF_ITALIC } from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function BestSeatInTheHouse({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.badge,
          { paddingHorizontal: 12 * s, paddingVertical: 5 * s },
        ]}
      >
        <Text style={[styles.text, { fontSize: 11 * s }]}>best seat in the house</Text>
      </View>
      <Text style={[styles.arrow, { top: 46 * s, fontSize: 12 * s }]}>↓</Text>

      <StoryWatermark position="bl" />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 18,
    alignSelf: 'center',
    backgroundColor: 'rgba(245,225,200,0.92)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(58,32,14,0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  text: {
    fontFamily: FONT_BODY_SERIF_ITALIC,
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#3a200e',
    letterSpacing: 0.3,
  },
  arrow: {
    position: 'absolute',
    alignSelf: 'center',
    color: '#fff',
    opacity: 0.8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
