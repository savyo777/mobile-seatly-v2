/**
 * Champagne Glow — soft gold radial glow on bottom edge, four bubbles
 * (10/8/6/5 px) drifting up the left side, italic "— Champagne Glow —"
 * centered bottom. Watermark TR.
 *
 * Reference: .f-champ, .bub.b1/b2/b3/b4, .lbl
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import { FONT_BODY_SERIF_ITALIC } from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function ChampagneGlow({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* gold glow at bottom */}
      <LinearGradient
        colors={['transparent', 'rgba(232,196,108,0.32)']}
        locations={[0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Bubble s={s} size={10} top="60%" left="18%" />
      <Bubble s={s} size={6}  top="48%" left="28%" />
      <Bubble s={s} size={8}  top="35%" left="22%" />
      <Bubble s={s} size={5}  top="25%" left="30%" />

      <View style={styles.label}>
        <Text style={[styles.title, { fontSize: 12 * s }]}>— Champagne Glow —</Text>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

function Bubble({
  s,
  size,
  top,
  left,
}: { s: number; size: number; top: string; left: string }) {
  return (
    <View
      style={[
        styles.bubble,
        {
          width: size * s,
          height: size * s,
          borderRadius: (size * s) / 2,
          top: top as any,
          left: left as any,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    backgroundColor: 'rgba(255,228,160,0.6)',
    borderColor: 'rgba(255,250,220,0.95)',
    borderWidth: 1,
    shadowColor: '#ffe4a0',
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20,
    alignItems: 'center',
  },
  title: {
    fontFamily: FONT_BODY_SERIF_ITALIC,
    fontStyle: 'italic',
    fontWeight: '300',
    color: '#f0e6d2',
    letterSpacing: 0.7,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
