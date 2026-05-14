/**
 * Golden Hour Glow — warm sunset light + bronzed glow + soft lens flares.
 * Source: filters.jsx → 'golden-hour' (renamed 'golden-hour-glow' to avoid
 * confusion with the existing 'golden-hour-dinner' fancy filter).
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CenaivaFilterBase } from './_cenaiva/CenaivaFilterBase';
import type { Accent } from './_cenaiva/FilterAccent';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

const ACCENTS: Accent[] = [
  { kind: 'flare', x: 82, y: 14, size: 50, color: 'rgba(255,210,150,0.55)' },
  { kind: 'flare', x: 18, y: 50, size: 30, color: 'rgba(255,170,90,0.35)' },
];

export function GoldenHourGlow({ width, height }: StoryFilterProps) {
  return (
    <CenaivaFilterBase
      width={width}
      height={height}
      watermark="tr"
      tintLayer={
        <LinearGradient
          colors={['rgba(255,170,80,0.10)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      }
      lightLayer={
        <LinearGradient
          colors={['rgba(255,190,120,0.32)', 'transparent', 'rgba(140,70,30,0.18)']}
          locations={[0, 0.55, 1]}
          start={{ x: 0.85, y: 0 }}
          end={{ x: 0.2, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      }
      vignetteLayer={
        <LinearGradient
          colors={['transparent', 'rgba(60,25,10,0.4)']}
          locations={[0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      }
      accents={ACCENTS}
    />
  );
}
