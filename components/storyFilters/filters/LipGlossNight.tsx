/**
 * Lip Gloss Night — 💋 sticker TL with pink drop shadow, italic Bodoni
 * "Lip Gloss Night" centred bottom over a small "· glossy ·" eyebrow,
 * watermark TR.
 *
 * Reference: .f-gloss, .kiss, .ttl, .sub small
 *
 * NOTE: the reference uses a pink-to-rose gradient on the title text
 * (background-clip:text). RN can't do gradient text without a masked-view
 * dependency, so we use the deepest pink from that gradient (#c84e6a) +
 * a soft pink glow shadow to keep the same overall feel.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import {
  FONT_DISPLAY_BODONI,
  FONT_SANS,
} from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function LipGlossNight({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Kiss sticker TL — emoji */}
      <View
        style={[
          styles.kissWrap,
          { transform: [{ rotate: '-15deg' }] },
        ]}
      >
        <Text style={[styles.kiss, { fontSize: 24 * s }]}>💋</Text>
      </View>

      {/* Title block bottom-centre */}
      <View style={styles.label}>
        <Text style={[styles.title, { fontSize: 14 * s }]}>Lip Gloss Night</Text>
        <Text style={[styles.eyebrow, { fontSize: 8 * s }]}>· GLOSSY ·</Text>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  kissWrap: {
    position: 'absolute',
    top: 14,
    left: 14,
    /* Faux drop-shadow glow around the emoji */
    shadowColor: '#d4546e',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  kiss: {
    color: '#fff', // emoji renders its own glyph; color is irrelevant
  },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20,
    alignItems: 'center',
  },
  title: {
    fontFamily: FONT_DISPLAY_BODONI,
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#f4a8c0',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(212,84,110,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  eyebrow: {
    fontFamily: FONT_SANS,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 4,
    marginTop: 3,
  },
});
