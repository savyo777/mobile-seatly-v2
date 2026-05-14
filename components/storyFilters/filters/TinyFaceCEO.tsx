/**
 * Tiny Face CEO — oversized forehead vibe + miniature face + executive props.
 * Source: filters.jsx → 'tiny-face-ceo'.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CenaivaFilterBase } from './_cenaiva/CenaivaFilterBase';
import type { Accent } from './_cenaiva/FilterAccent';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

const ACCENTS: Accent[] = [
  { kind: 'tinyFace', x: 50, y: 50, size: 18 },
  { kind: 'tag', x: 50, y: 60, text: 'CEO MODE ACTIVATED', style: 'corp' },
  { kind: 'emoji', x: 18, y: 30, char: '💼', size: 30, tilt: -10 },
  { kind: 'emoji', x: 82, y: 30, char: '📈', size: 30, tilt: 10 },
];

export function TinyFaceCEO({ width, height }: StoryFilterProps) {
  return (
    <CenaivaFilterBase
      width={width}
      height={height}
      watermark="tr"
      vignetteLayer={
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.35)']}
          locations={[0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      }
      accents={ACCENTS}
    />
  );
}
