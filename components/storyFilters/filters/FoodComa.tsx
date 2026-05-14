/**
 * Food Coma — puffy cheeks, sleepy eyes, "i ate too much" energy.
 * Source: filters.jsx → 'food-coma'.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CenaivaFilterBase } from './_cenaiva/CenaivaFilterBase';
import type { Accent } from './_cenaiva/FilterAccent';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

const ACCENTS: Accent[] = [
  { kind: 'puffyCheek', x: 26, y: 44, size: 20 },
  { kind: 'puffyCheek', x: 74, y: 44, size: 20 },
  { kind: 'sleepyEye', x: 35, y: 32 },
  { kind: 'sleepyEye', x: 65, y: 32 },
  { kind: 'emoji', x: 14, y: 18, char: '🍕', size: 30, tilt: -14 },
  { kind: 'emoji', x: 86, y: 22, char: '🍔', size: 30, tilt: 18 },
  { kind: 'emoji', x: 90, y: 50, char: '🍰', size: 26, tilt: -6 },
  { kind: 'emoji', x: 10, y: 52, char: '🥟', size: 26, tilt: 10 },
  { kind: 'emoji', x: 70, y: 12, char: '💤', size: 22 },
  { kind: 'tag', x: 50, y: 60, text: 'i ate too much', style: 'soft' },
];

export function FoodComa({ width, height }: StoryFilterProps) {
  return (
    <CenaivaFilterBase
      width={width}
      height={height}
      watermark="tr"
      vignetteLayer={
        <LinearGradient
          colors={['transparent', 'rgba(40,20,10,0.3)']}
          locations={[0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
      }
      accents={ACCENTS}
    />
  );
}
