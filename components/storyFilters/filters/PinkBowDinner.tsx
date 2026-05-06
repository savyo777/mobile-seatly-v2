/**
 * Pink Bow Dinner — pink bows TL + BR, soft pink glow on bottom edge,
 * three sparkles, Pinyon-script "Pink Bow Dinner" label, watermark TR.
 *
 * Reference selectors: .f-bowdinner, .bow.tl, .bow.br, .glow, .sp1/2/3, .lbl
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BowGlyph, Sparkle } from '@/components/storyFilters/glyphs';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import { FONT_SCRIPT_FORMAL } from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function PinkBowDinner({ width, height }: StoryFilterProps) {
  // Decoration scale — designed at 224×398 reference.
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Soft pink glow at bottom — radial-ish using gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(244,182,194,0.32)']}
        locations={[0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Bows */}
      <View style={[styles.bowTL, { transform: [{ rotate: '-15deg' }] }]}>
        <BowGlyph size={34 * s} />
      </View>
      <View
        style={[
          styles.bowBR,
          { bottom: 60 * s, transform: [{ rotate: '20deg' }, { scale: 0.85 }] },
        ]}
      >
        <BowGlyph size={34 * s} />
      </View>

      {/* Sparkles — same coordinates as the reference (% of frame) */}
      <View style={[styles.sp, { top: '30%', left: '60%' }]}>
        <Sparkle size={10 * s} />
      </View>
      <View style={[styles.sp, { top: '55%', left: '18%' }]}>
        <Sparkle size={8 * s} />
      </View>
      <View style={[styles.sp, { top: '70%', left: '75%' }]}>
        <Sparkle size={11 * s} />
      </View>

      {/* Label */}
      <View style={styles.label}>
        <Text style={[styles.labelText, { fontSize: 22 * s }]}>
          Pink Bow Dinner
        </Text>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  bowTL: { position: 'absolute', top: 14, left: 14 },
  bowBR: { position: 'absolute', right: 14 },
  sp: { position: 'absolute' },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: 'center',
  },
  labelText: {
    fontFamily: FONT_SCRIPT_FORMAL,
    color: '#ffffff',
    textShadowColor: 'rgba(212,84,110,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
