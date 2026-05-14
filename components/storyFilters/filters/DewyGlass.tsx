/**
 * Dewy Glass — clean fresh look, dew highlights on cheeks, glossy lip.
 * Source: filters.jsx → 'dewy-glass'.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CenaivaFilterBase } from './_cenaiva/CenaivaFilterBase';
import type { Accent } from './_cenaiva/FilterAccent';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

const ACCENTS: Accent[] = [
  { kind: 'dew', x: 28, y: 30, size: 6 },
  { kind: 'dew', x: 72, y: 26, size: 8 },
  { kind: 'dew', x: 55, y: 42, size: 5 },
  { kind: 'dew', x: 38, y: 48, size: 7 },
  { kind: 'gloss', x: 50, y: 52, w: 16, h: 2.5, color: 'rgba(255,255,255,0.7)' },
];

export function DewyGlass({ width, height }: StoryFilterProps) {
  return (
    <CenaivaFilterBase
      width={width}
      height={height}
      watermark="tr"
      lightLayer={
        <LinearGradient
          colors={['rgba(255,255,255,0.28)', 'transparent']}
          locations={[0, 0.7]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      }
      vignetteLayer={
        <LinearGradient
          colors={['transparent', 'rgba(180,200,220,0.18)']}
          locations={[0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
      }
      accents={ACCENTS}
    />
  );
}
