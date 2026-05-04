import React from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { SnapFilterOption } from '@/lib/mock/reviewSnap';

function asGradientColors(colors: readonly string[]): [ColorValue, ColorValue, ...ColorValue[]] {
  const [a, b, ...rest] = colors;
  return [a, b, ...rest] as [ColorValue, ColorValue, ...ColorValue[]];
}

function asGradientLocations(
  locations: readonly number[] | undefined,
  colorCount: number,
): readonly [number, number, ...number[]] | undefined {
  if (!locations || locations.length < 2 || locations.length !== colorCount) return undefined;
  const [a, b, ...rest] = locations;
  return [a, b, ...rest] as readonly [number, number, ...number[]];
}

type Props = {
  filter: SnapFilterOption;
};

/**
 * Renders the in-camera / preview look for a snap filter (stacked tint, gradient, vignette).
 */
export function SnapFilterOverlay({ filter }: Props) {
  if (filter.id === 'none') return null;

  const hasSolid = filter.overlayOpacity > 0.001;
  const hasGradient = Boolean(filter.gradientColors && filter.gradientColors.length >= 2);
  const hasVignette = Boolean(filter.vignetteStrength && filter.vignetteStrength > 0);

  if (!hasSolid && !hasGradient && !hasVignette) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {hasSolid ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: filter.overlayColor, opacity: filter.overlayOpacity },
          ]}
        />
      ) : null}
      {hasGradient && filter.gradientColors ? (
        <LinearGradient
          colors={asGradientColors(filter.gradientColors)}
          locations={asGradientLocations(filter.gradientLocations, filter.gradientColors.length)}
          start={filter.gradientStart ?? { x: 0.5, y: 0 }}
          end={filter.gradientEnd ?? { x: 0.5, y: 1 }}
          style={[
            StyleSheet.absoluteFill,
            filter.gradientOpacity != null ? { opacity: filter.gradientOpacity } : undefined,
          ]}
        />
      ) : null}
      {hasVignette && filter.vignetteStrength ? (
        <LinearGradient
          colors={[
            `rgba(0,0,0,${filter.vignetteStrength})`,
            'rgba(0,0,0,0)',
            `rgba(0,0,0,${filter.vignetteStrength * 0.88})`,
          ]}
          locations={[0, 0.42, 1]}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </View>
  );
}
