/**
 * Drama Queen — sparkle tears + dramatic lashes + WHY ME?! bubble.
 * Source: filters.jsx → 'drama-queen'.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CenaivaFilterBase } from './_cenaiva/CenaivaFilterBase';
import type { Accent } from './_cenaiva/FilterAccent';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

const ACCENTS: Accent[] = [
  { kind: 'lashes', x: 35, y: 32 },
  { kind: 'lashes', x: 65, y: 32 },
  { kind: 'tear', x: 33, y: 42 },
  { kind: 'tear', x: 67, y: 42 },
  { kind: 'sparkle', x: 18, y: 18, size: 14 },
  { kind: 'sparkle', x: 82, y: 14, size: 18 },
  { kind: 'sparkle', x: 88, y: 44, size: 12 },
  { kind: 'sparkle', x: 12, y: 48, size: 16 },
  { kind: 'bubble', x: 50, y: 10, text: 'WHY ME?!', style: 'shout' },
  { kind: 'tag', x: 50, y: 58, text: 'i can’t even', style: 'soft' },
];

export function DramaQueen({ width, height }: StoryFilterProps) {
  return (
    <CenaivaFilterBase
      width={width}
      height={height}
      watermark="tr"
      vignetteLayer={
        <LinearGradient
          colors={['transparent', 'rgba(20,10,30,0.4)']}
          locations={[0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      }
      accents={ACCENTS}
    />
  );
}
