import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import {
  FONT_BODY_SERIF,
  FONT_MONO,
} from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function PizzaDate({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.ticket,
          {
            paddingHorizontal: 10 * s,
            paddingVertical: 5 * s,
            transform: [{ rotate: '-3deg' }],
          },
        ]}
      >
        <Text style={[styles.eyebrow, { fontSize: 9 * s }]}>SLICE NIGHT</Text>
        <Text style={[styles.title, { fontSize: 13 * s }]}>Pizza Date</Text>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 20,
    backgroundColor: '#fff',
    borderRadius: 3,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  eyebrow: {
    fontFamily: FONT_MONO,
    fontWeight: '500',
    color: '#0a0a0a',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  title: {
    marginTop: 1,
    fontFamily: FONT_BODY_SERIF,
    fontWeight: '700',
    color: '#0a0a0a',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
