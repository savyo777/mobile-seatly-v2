/**
 * Main Character Meltdown — chaotic sparkles, panic emojis, overthinking bubble.
 * Source: filters.jsx → 'main-character' (renamed 'main-character-meltdown'
 * to avoid confusion with the existing 'main-character-meal').
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CenaivaFilterBase } from './_cenaiva/CenaivaFilterBase';
import type { Accent } from './_cenaiva/FilterAccent';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

const ACCENTS: Accent[] = [
  { kind: 'sparkle', x: 14, y: 18, size: 18 },
  { kind: 'sparkle', x: 86, y: 14, size: 22 },
  { kind: 'sparkle', x: 92, y: 46, size: 14 },
  { kind: 'sparkle', x: 8, y: 52, size: 16 },
  { kind: 'sparkle', x: 62, y: 10, size: 12 },
  { kind: 'emoji', x: 88, y: 32, char: '⁉️', size: 24, tilt: 14 },
  { kind: 'emoji', x: 12, y: 36, char: '💥', size: 24, tilt: -10 },
  { kind: 'messyHair', x: 50, y: 8 },
  { kind: 'bubble', x: 50, y: 18, text: 'currently overthinking', style: 'thought' },
  { kind: 'tag', x: 50, y: 60, text: 'MAIN CHARACTER · MELTDOWN', style: 'chaos' },
];

export function MainCharacterMeltdown({ width, height }: StoryFilterProps) {
  return (
    <CenaivaFilterBase
      width={width}
      height={height}
      watermark="tr"
      lightLayer={
        <LinearGradient
          colors={['rgba(255,200,220,0.18)', 'transparent']}
          start={{ x: 0.3, y: 0.28 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      }
      vignetteLayer={
        <LinearGradient
          colors={['transparent', 'rgba(30,5,30,0.5)']}
          locations={[0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      }
      accents={ACCENTS}
    />
  );
}
