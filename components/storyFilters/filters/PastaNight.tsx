import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PastaStrands } from '@/components/storyFilters/glyphs';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import {
  FONT_SANS,
  FONT_SCRIPT_HANDWRITTEN,
} from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function PastaNight({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.doodle}>
        <PastaStrands width={36 * s} />
      </View>

      <View style={styles.label}>
        <Text style={[styles.title, { fontSize: 22 * s }]}>Pasta night</Text>
        <Text style={[styles.sub, { fontSize: 8 * s }]}>· AL DENTE ·</Text>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  doodle: {
    position: 'absolute',
    top: 14,
    left: 14,
  },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20,
    alignItems: 'center',
  },
  title: {
    fontFamily: FONT_SCRIPT_HANDWRITTEN,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    transform: [{ rotate: '-2deg' }],
  },
  sub: {
    marginTop: 6,
    fontFamily: FONT_SANS,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 4,
  },
});
