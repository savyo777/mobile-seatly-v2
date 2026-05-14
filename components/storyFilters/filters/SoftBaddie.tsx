/**
 * Soft Baddie — lifted lashes liner, glossy crimson lips, confident glam.
 * Source: filters.jsx → 'soft-baddie'.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CenaivaFilterBase } from './_cenaiva/CenaivaFilterBase';
import type { Accent } from './_cenaiva/FilterAccent';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

const ACCENTS: Accent[] = [
  { kind: 'liner', x: 32, y: 36, w: 14, h: 1.5 },
  { kind: 'liner', x: 68, y: 36, w: 14, h: 1.5 },
  { kind: 'gloss', x: 50, y: 52, w: 18, h: 3, color: 'rgba(220,80,100,0.55)' },
];

export function SoftBaddie({ width, height }: StoryFilterProps) {
  return (
    <CenaivaFilterBase
      width={width}
      height={height}
      watermark="tr"
      lightLayer={
        <LinearGradient
          colors={['rgba(255,200,170,0.22)', 'transparent']}
          start={{ x: 0.75, y: 0.1 }}
          end={{ x: 0.25, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />
      }
      vignetteLayer={
        <LinearGradient
          colors={['transparent', 'rgba(30,8,15,0.5)']}
          locations={[0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      }
      accents={ACCENTS}
    />
  );
}
