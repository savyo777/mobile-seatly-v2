/**
 * Butterfly Glow — pink + lilac corner light leaks (TR pink, BL lilac),
 * three small butterflies in the foreground, italic "Butterfly Glow"
 * label centred bottom, watermark TR.
 *
 * Reference: .f-butterfly, .leak, .b1/b2/b3, .lbl
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ButterflyGlyph } from '@/components/storyFilters/glyphs';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import { FONT_BODY_SERIF_ITALIC } from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function ButterflyGlow({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Pink leak — top-right corner */}
      <LinearGradient
        colors={['rgba(244,182,194,0.45)', 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.4, y: 0.55 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Lilac leak — bottom-left corner */}
      <LinearGradient
        colors={['transparent', 'rgba(200,182,226,0.45)']}
        start={{ x: 1, y: 0.45 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Butterflies */}
      <View style={[styles.b, { top: '18%', left: '14%' }]}>
        <ButterflyGlyph size={24 * s} fill="#f4b6c2" stroke="#d97488" />
      </View>
      <View
        style={[
          styles.b,
          { top: '38%', right: '18%', transform: [{ rotate: '15deg' }] },
        ]}
      >
        <ButterflyGlyph size={18 * s} fill="#c8b6e2" stroke="#7a5a98" />
      </View>
      <View
        style={[
          styles.b,
          { bottom: '24%', left: '60%', transform: [{ rotate: '-10deg' }] },
        ]}
      >
        <ButterflyGlyph size={14 * s} fill="#f4b6c2" stroke="#d97488" />
      </View>

      {/* Label */}
      <View style={styles.label}>
        <Text style={[styles.title, { fontSize: 12 * s }]}>Butterfly Glow</Text>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  b: { position: 'absolute' },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: 'center',
  },
  title: {
    fontFamily: FONT_BODY_SERIF_ITALIC,
    fontStyle: 'italic',
    color: '#fff',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(124,90,170,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
