/**
 * Uncle at the BBQ — aviators + thick mustache + smoky grillmaster energy.
 * Source: filters.jsx → 'uncle-bbq'.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CenaivaFilterBase } from './_cenaiva/CenaivaFilterBase';
import type { Accent } from './_cenaiva/FilterAccent';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

const ACCENTS: Accent[] = [
  { kind: 'aviators', x: 50, y: 32 },
  { kind: 'mustache', x: 50, y: 48 },
  { kind: 'smoke', x: 80, y: 56, size: 60 },
  { kind: 'smoke', x: 20, y: 60, size: 50 },
  { kind: 'emoji', x: 14, y: 18, char: '🌭', size: 28, tilt: -12 },
  { kind: 'emoji', x: 86, y: 18, char: '🍖', size: 28, tilt: 12 },
  { kind: 'tag', x: 50, y: 60, text: 'GRILLMASTER · EST. ‘79', style: 'stamp' },
];

export function UncleBBQ({ width, height }: StoryFilterProps) {
  return (
    <CenaivaFilterBase
      width={width}
      height={height}
      watermark="tr"
      vignetteLayer={
        <LinearGradient
          colors={['transparent', 'rgba(40,20,5,0.45)']}
          locations={[0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      }
      accents={ACCENTS}
    />
  );
}
