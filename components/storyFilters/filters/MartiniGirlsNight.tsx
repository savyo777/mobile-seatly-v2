/**
 * Martini Girls Night — three white martini-glass doodles + a cream pill
 * "girls' night" in burgundy serif italic, watermark TR.
 *
 * Reference: .f-martini, .doodle.d1/d2/d3, .badge
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MartiniGlyph } from '@/components/storyFilters/glyphs';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import { FONT_BODY_SERIF_ITALIC } from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function MartiniGirlsNight({ width }: StoryFilterProps) {
  const s = width / 224;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Three doodles at d1/d2/d3 positions */}
      <View style={[styles.doodle, { top: '12%', left: '10%' }]}>
        <MartiniGlyph size={26 * s} cherry />
      </View>
      <View
        style={[
          styles.doodle,
          { top: '8%', right: '14%', transform: [{ rotate: '8deg' }] },
        ]}
      >
        <MartiniGlyph size={22 * s} />
      </View>
      <View
        style={[
          styles.doodle,
          { bottom: '20%', left: '14%', transform: [{ rotate: '-6deg' }] },
        ]}
      >
        <MartiniGlyph size={20 * s} cherry />
      </View>

      {/* Cream pill — "girls' night" */}
      <View style={[styles.badge, { paddingHorizontal: 12 * s, paddingVertical: 5 * s }]}>
        <Text style={[styles.badgeText, { fontSize: 11 * s }]}>girls' night</Text>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  doodle: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  badge: {
    position: 'absolute',
    bottom: 18,
    alignSelf: 'center',
    backgroundColor: 'rgba(245,225,225,0.92)',
    borderColor: 'rgba(90,18,36,0.2)',
    borderWidth: 1,
    borderRadius: 999,
    shadowColor: '#5a1224',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  badgeText: {
    fontFamily: FONT_BODY_SERIF_ITALIC,
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#5a1224',
    letterSpacing: 0.3,
  },
});
