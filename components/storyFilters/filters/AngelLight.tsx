/**
 * Angel Light — soft dreamy halo + gentle blush + smooth skin.
 * Source: filters.jsx → 'angel-light'.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CenaivaFilterBase } from './_cenaiva/CenaivaFilterBase';
import type { Accent } from './_cenaiva/FilterAccent';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

const ACCENTS: Accent[] = [
  { kind: 'halo', x: 50, y: 6, size: 70 },
  { kind: 'blush', x: 30, y: 44, size: 14 },
  { kind: 'blush', x: 70, y: 44, size: 14 },
];

export function AngelLight({ width, height }: StoryFilterProps) {
  return (
    <CenaivaFilterBase
      width={width}
      height={height}
      watermark="tr"
      lightLayer={
        <LinearGradient
          colors={['rgba(255,255,255,0.5)', 'transparent']}
          locations={[0, 0.55]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      }
      vignetteLayer={
        <LinearGradient
          colors={['transparent', 'rgba(240,220,230,0.3)']}
          locations={[0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      }
      accents={ACCENTS}
    />
  );
}
