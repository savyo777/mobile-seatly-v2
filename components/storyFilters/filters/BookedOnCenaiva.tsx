import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import { FONT_SANS } from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function BookedOnCenaiva({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.pill,
          {
            paddingLeft: 8 * s,
            paddingRight: 12 * s,
            paddingVertical: 6 * s,
            gap: 6 * s,
          },
        ]}
      >
        <View
          style={[
            styles.check,
            { width: 13 * s, height: 13 * s, borderRadius: 6.5 * s },
          ]}
        >
          <Text style={[styles.checkText, { fontSize: 8 * s }]}>✓</Text>
        </View>
        <Text style={[styles.text, { fontSize: 10 * s }]}>Booked on Cenaiva</Text>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  check: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  checkText: {
    color: '#0a0a0a',
    fontWeight: '800',
    lineHeight: 10,
  },
  text: {
    fontFamily: FONT_SANS,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: 0.2,
  },
});
