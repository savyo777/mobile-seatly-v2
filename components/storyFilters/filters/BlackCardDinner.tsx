import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import {
  FONT_DISPLAY_SERIF,
  FONT_MONO,
} from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function BlackCardDinner({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.card,
          {
            width: 130 * s,
            height: 42 * s,
            paddingHorizontal: 10 * s,
            paddingVertical: 6 * s,
            transform: [{ rotate: '-3deg' }],
          },
        ]}
      >
        <View style={styles.top}>
          <Text style={[styles.brand, { fontSize: 9 * s }]}>Cenaiva</Text>
          <View style={[styles.chip, { width: 14 * s, height: 10 * s }]} />
        </View>
        <Text style={[styles.number, { fontSize: 9 * s }]}>•••• •••• •••• 0824</Text>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    borderRadius: 6,
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontFamily: FONT_DISPLAY_SERIF,
    color: '#c9a86a',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  chip: {
    borderRadius: 1,
    backgroundColor: '#c9a86a',
    opacity: 0.9,
  },
  number: {
    fontFamily: FONT_MONO,
    color: 'rgba(201,168,106,0.85)',
    letterSpacing: 1,
  },
});
