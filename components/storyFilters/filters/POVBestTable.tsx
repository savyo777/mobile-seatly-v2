/**
 * POV: Best Table — bold caps "POV:" TL with Cormorant italic "best table."
 * inline next to it. Watermark BL.
 *
 * Reference: .f-pov, .pov, .pov span
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import {
  FONT_BODY_SERIF_ITALIC,
  FONT_SANS,
} from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function POVBestTable({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.row}>
        <Text style={[styles.pov, { fontSize: 11 * s }]}>POV:</Text>
        <Text style={[styles.tail, { fontSize: 13 * s }]}>best table.</Text>
      </View>

      <StoryWatermark position="bl" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    top: 16,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pov: {
    fontFamily: FONT_SANS,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1.8,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tail: {
    marginLeft: 4,
    fontFamily: FONT_BODY_SERIF_ITALIC,
    fontStyle: 'italic',
    fontWeight: '300',
    color: '#ffd6e0',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
