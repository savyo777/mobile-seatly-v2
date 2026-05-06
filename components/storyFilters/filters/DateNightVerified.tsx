/**
 * Date Night Verified — frosted dark pill BL with gold ✓ disc + Cormorant
 * italic "Date Night Verified". Watermark TR.
 *
 * Reference: .f-dnv, .b, .t
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import { FONT_BODY_SERIF_ITALIC } from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

const GOLD = '#c9a86a';

export function DateNightVerified({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.pill,
          {
            paddingLeft: 6 * s,
            paddingRight: 10 * s,
            paddingVertical: 5 * s,
            gap: 6 * s,
          },
        ]}
      >
        <View
          style={[
            styles.dot,
            { width: 13 * s, height: 13 * s, borderRadius: (13 * s) / 2 },
          ]}
        >
          <Text style={[styles.dotText, { fontSize: 8 * s }]}>✓</Text>
        </View>
        <Text style={[styles.label, { fontSize: 11 * s }]}>Date Night Verified</Text>
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
    backgroundColor: 'rgba(10,8,6,0.55)',
    borderColor: 'rgba(201,168,106,0.45)',
    borderWidth: 1,
    borderRadius: 999,
  },
  dot: {
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: {
    color: '#1a1208',
    fontWeight: '800',
  },
  label: {
    fontFamily: FONT_BODY_SERIF_ITALIC,
    fontStyle: 'italic',
    fontWeight: '500',
    color: '#fff',
    letterSpacing: 0.3,
  },
});
