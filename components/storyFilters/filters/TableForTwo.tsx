import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import {
  FONT_BODY_SERIF_ITALIC,
  FONT_DISPLAY_SERIF,
} from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function TableForTwo({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.rule, { bottom: 62 * s, width: 30 * s }]} />
      <View style={styles.label}>
        <Text style={[styles.title, { fontSize: 13 * s }]}>Table for Two</Text>
        <Text style={[styles.sub, { fontSize: 10 * s }]}>— reserved —</Text>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  rule: {
    position: 'absolute',
    alignSelf: 'center',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20,
    alignItems: 'center',
  },
  title: {
    fontFamily: FONT_DISPLAY_SERIF,
    color: '#fff',
    letterSpacing: 3.6,
    textTransform: 'uppercase',
  },
  sub: {
    marginTop: 2,
    fontFamily: FONT_BODY_SERIF_ITALIC,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.7)',
  },
});
