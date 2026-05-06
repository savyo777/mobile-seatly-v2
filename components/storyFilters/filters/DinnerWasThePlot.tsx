/**
 * Dinner Was the Plot — Pinyon-script "Dinner was the plot" centered
 * bottom over an Inter-light caps eyebrow "· chapter one ·". Watermark TR.
 *
 * Reference: .f-plot, .scrip b, .scrip small
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import {
  FONT_SCRIPT_FORMAL,
  FONT_SANS,
} from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function DinnerWasThePlot({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.label}>
        <Text style={[styles.title, { fontSize: 22 * s }]}>Dinner was the plot</Text>
        <Text style={[styles.eyebrow, { fontSize: 9 * s }]}>· CHAPTER ONE ·</Text>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 22,
    alignItems: 'center',
  },
  title: {
    fontFamily: FONT_SCRIPT_FORMAL,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  eyebrow: {
    fontFamily: FONT_SANS,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 4,
    marginTop: 5,
  },
});
