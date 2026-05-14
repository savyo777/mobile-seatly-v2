/**
 * <CenaivaFilterBase /> — shared shell for the 12 Cenaiva camera filters.
 *
 * Each Cenaiva filter passes its colour-grade tint, light pass, vignette,
 * and a list of `Accent`s; this base lays them out in the right z-order:
 *
 *   1. tint        (low-opacity colour cast — approximates cssFilter)
 *   2. light       (warm/soft highlight gradient)
 *   3. accents     (sparkles, emojis, tags, etc.)
 *   4. vignette    (corner darkening)
 *   5. watermark   ("by Cenaiva")
 *
 * Reference frame: 224×398 (same as the existing 30 filters). The base
 * scales accents by `width / 224` so decorations stay proportional.
 */
import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import { FilterAccent, type Accent } from './FilterAccent';

const REF_W = 224;

type Props = {
  width: number;
  height: number;
  watermark: 'tr' | 'bl';
  tintLayer?: ReactNode;
  lightLayer?: ReactNode;
  vignetteLayer?: ReactNode;
  accents: Accent[];
};

export function CenaivaFilterBase({
  width,
  height,
  watermark,
  tintLayer,
  lightLayer,
  vignetteLayer,
  accents,
}: Props) {
  const scale = width / REF_W;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {tintLayer ? <View style={StyleSheet.absoluteFill}>{tintLayer}</View> : null}
      {lightLayer ? <View style={StyleSheet.absoluteFill}>{lightLayer}</View> : null}
      <View style={StyleSheet.absoluteFill}>
        {accents.map((a, i) => (
          <FilterAccent key={i} a={a} scale={scale} frameW={width} frameH={height} />
        ))}
      </View>
      {vignetteLayer ? <View style={StyleSheet.absoluteFill}>{vignetteLayer}</View> : null}
      <StoryWatermark position={watermark} />
    </View>
  );
}
