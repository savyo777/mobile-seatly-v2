/**
 * Lux Gem — luxury glam: smooth skin glow, glossy lips, gem-light shimmer.
 * Source: filters.jsx → 'lux-gem'.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CenaivaFilterBase } from './_cenaiva/CenaivaFilterBase';
import type { Accent } from './_cenaiva/FilterAccent';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

const ACCENTS: Accent[] = [
  { kind: 'gloss', x: 50, y: 50, w: 18, h: 3, color: 'rgba(255,255,255,0.55)' },
  { kind: 'shimmer', x: 30, y: 22, size: 10 },
  { kind: 'shimmer', x: 70, y: 26, size: 8 },
];

export function LuxGem({ width, height }: StoryFilterProps) {
  return (
    <CenaivaFilterBase
      width={width}
      height={height}
      watermark="tr"
      lightLayer={
        <LinearGradient
          colors={['rgba(190,160,255,0.18)', 'rgba(255,220,190,0.16)', 'transparent']}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      }
      vignetteLayer={
        <LinearGradient
          colors={['transparent', 'rgba(20,10,30,0.35)']}
          locations={[0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      }
      accents={ACCENTS}
    />
  );
}
