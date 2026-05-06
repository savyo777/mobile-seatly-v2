/**
 * Birthday Princess — gold crown TC, four gold sparkles, "It's her day"
 * eyebrow + Cormorant italic "Birthday Princess", watermark TR.
 *
 * Reference: .f-princess, .crown, .lbl, .sp.s1/s2/s3/s4
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CrownGlyph, Sparkle } from '@/components/storyFilters/glyphs';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import {
  FONT_BODY_SERIF_ITALIC,
  FONT_SANS,
} from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

const GOLD = '#c9a86a';

export function BirthdayPrincess({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Crown — top centre */}
      <View style={[styles.crown, { top: 12 * s }]}>
        <CrownGlyph size={36 * s} />
      </View>

      {/* Sparkles */}
      <View style={[styles.sp, { top: '24%', left: '18%' }]}>
        <Sparkle size={10 * s} color={GOLD} />
      </View>
      <View style={[styles.sp, { top: '30%', right: '16%' }]}>
        <Sparkle size={7 * s} color={GOLD} />
      </View>
      <View style={[styles.sp, { top: '55%', left: '75%' }]}>
        <Sparkle size={11 * s} color={GOLD} />
      </View>
      <View style={[styles.sp, { bottom: '30%', left: '12%' }]}>
        <Sparkle size={8 * s} color={GOLD} />
      </View>

      {/* Label */}
      <View style={styles.label}>
        <Text style={[styles.eyebrow, { fontSize: 7 * s }]}>IT'S HER DAY</Text>
        <Text style={[styles.title, { fontSize: 13 * s }]}>Birthday Princess</Text>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  crown: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    /* Soft gold drop-shadow to match reference filter:drop-shadow */
    shadowColor: GOLD,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
  },
  sp: { position: 'absolute' },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 22,
    alignItems: 'center',
  },
  eyebrow: {
    fontFamily: FONT_SANS,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 4,
    marginBottom: 3,
  },
  title: {
    fontFamily: FONT_BODY_SERIF_ITALIC,
    fontStyle: 'italic',
    fontWeight: '500',
    color: '#fff',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(201,168,106,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
