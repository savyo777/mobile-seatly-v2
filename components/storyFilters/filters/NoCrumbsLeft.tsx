/**
 * No Crumbs Left — pink Caveat tag tilted -6deg in the BL, plus a small
 * curved arrow swooping toward the dish (above the tag). Watermark TR.
 *
 * Reference: .f-crumbs, .funny-tag.tag.pink, .arrow
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArrowSwoop } from '@/components/storyFilters/glyphs';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import { FONT_SCRIPT_HANDWRITTEN } from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function NoCrumbsLeft({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.arrow,
          { left: 64 * s, bottom: 66 * s },
        ]}
      >
        <ArrowSwoop width={36 * s} color="#ffd6e0" />
      </View>

      <View
        style={[
          styles.tag,
          { left: 14, bottom: 18, transform: [{ rotate: '-6deg' }] },
        ]}
      >
        <Text style={[styles.tagText, { fontSize: 22 * s }]}>no crumbs left.</Text>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  arrow: { position: 'absolute' },
  tag: { position: 'absolute' },
  tagText: {
    fontFamily: FONT_SCRIPT_HANDWRITTEN,
    fontWeight: '600',
    color: '#ffd6e0',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
