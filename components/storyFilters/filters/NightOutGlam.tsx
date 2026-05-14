/**
 * Night Out Glam — flash lighting + defined eyes + glossy nightlife glam.
 * Source: filters.jsx → 'night-out'.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CenaivaFilterBase } from './_cenaiva/CenaivaFilterBase';
import type { Accent } from './_cenaiva/FilterAccent';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

const ACCENTS: Accent[] = [
  { kind: 'gloss', x: 50, y: 52, w: 18, h: 3.5, color: 'rgba(220,60,90,0.65)' },
  { kind: 'shimmer', x: 28, y: 36, size: 7 },
  { kind: 'shimmer', x: 72, y: 36, size: 7 },
  { kind: 'liner', x: 32, y: 36, w: 12, h: 1.5 },
  { kind: 'liner', x: 68, y: 36, w: 12, h: 1.5 },
];

export function NightOutGlam({ width, height }: StoryFilterProps) {
  return (
    <CenaivaFilterBase
      width={width}
      height={height}
      watermark="tr"
      tintLayer={
        <LinearGradient
          colors={['rgba(0,0,0,0.18)', 'rgba(0,0,0,0.45)']}
          locations={[0, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      }
      lightLayer={
        <LinearGradient
          colors={['rgba(255,240,220,0.4)', 'transparent']}
          locations={[0, 0.55]}
          start={{ x: 0.5, y: 0.2 }}
          end={{ x: 0.5, y: 0.8 }}
          style={StyleSheet.absoluteFill}
        />
      }
      vignetteLayer={
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          locations={[0.35, 1]}
          style={StyleSheet.absoluteFill}
        />
      }
      accents={ACCENTS}
    />
  );
}
