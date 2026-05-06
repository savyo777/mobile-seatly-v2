import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import {
  FONT_BODY_SERIF_ITALIC,
  FONT_DISPLAY_SERIF,
} from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function VelvetNight({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.cornerTL, { width: 30 * s, height: 30 * s }]} />
      <View style={[styles.cornerBR, { width: 30 * s, height: 30 * s }]} />

      <View style={styles.label}>
        <Text style={[styles.title, { fontSize: 14 * s }]}>Velvet Night</Text>
        <Text style={[styles.sub, { fontSize: 10 * s }]}>— a private room —</Text>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

const cornerBase = {
  position: 'absolute' as const,
  borderColor: 'rgba(244,212,200,0.5)',
};

const styles = StyleSheet.create({
  cornerTL: {
    ...cornerBase,
    top: 14,
    left: 14,
    borderTopWidth: 1,
    borderLeftWidth: 1,
  },
  cornerBR: {
    ...cornerBase,
    bottom: 14,
    right: 14,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
  },
  title: {
    fontFamily: FONT_DISPLAY_SERIF,
    color: '#f4d4c8',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  sub: {
    marginTop: 3,
    fontFamily: FONT_BODY_SERIF_ITALIC,
    fontStyle: 'italic',
    color: 'rgba(244,212,200,0.7)',
  },
});
