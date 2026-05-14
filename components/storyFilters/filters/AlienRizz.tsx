/**
 * Alien Rizz — green glow + big alien eyes + antennas. Rizz from another planet.
 * Source: filters.jsx → 'alien-rizz'.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CenaivaFilterBase } from './_cenaiva/CenaivaFilterBase';
import type { Accent } from './_cenaiva/FilterAccent';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

const ACCENTS: Accent[] = [
  { kind: 'antenna', x: 38, y: 6 },
  { kind: 'antenna', x: 62, y: 6, mirror: true },
  { kind: 'bigEye', x: 35, y: 32 },
  { kind: 'bigEye', x: 65, y: 32 },
  { kind: 'sparkle', x: 14, y: 50, size: 14, color: '#a8ffb8' },
  { kind: 'sparkle', x: 86, y: 52, size: 16, color: '#a8ffb8' },
  { kind: 'tag', x: 50, y: 60, text: 'rizz from another planet', style: 'alien' },
];

export function AlienRizz({ width, height }: StoryFilterProps) {
  return (
    <CenaivaFilterBase
      width={width}
      height={height}
      watermark="tr"
      tintLayer={
        <LinearGradient
          colors={['rgba(40,180,90,0.18)', 'rgba(0,80,30,0.22)']}
          locations={[0, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      }
      lightLayer={
        <LinearGradient
          colors={['rgba(120,255,140,0.22)', 'transparent']}
          locations={[0, 0.65]}
          start={{ x: 0.5, y: 0.45 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      }
      vignetteLayer={
        <LinearGradient
          colors={['transparent', 'rgba(0,30,10,0.55)']}
          locations={[0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      }
      accents={ACCENTS}
    />
  );
}
