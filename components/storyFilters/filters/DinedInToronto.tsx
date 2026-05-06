import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PinGlyph } from '@/components/storyFilters/glyphs';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import {
  FONT_BODY_SERIF,
  FONT_SANS,
} from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function DinedInToronto({ width, city }: StoryFilterProps) {
  const s = width / 224;
  const cityLabel = city?.trim() || 'Toronto';
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.pin,
          {
            paddingLeft: 8 * s,
            paddingRight: 11 * s,
            paddingVertical: 5 * s,
            gap: 5 * s,
          },
        ]}
      >
        <PinGlyph size={12 * s} />
        <View>
          <Text style={[styles.small, { fontSize: 8 * s }]}>Dined in</Text>
          <Text style={[styles.city, { fontSize: 12 * s }]} numberOfLines={1}>
            {cityLabel}
          </Text>
        </View>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  pin: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  small: {
    fontFamily: FONT_SANS,
    fontWeight: '300',
    color: '#7a766f',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: -1,
  },
  city: {
    fontFamily: FONT_BODY_SERIF,
    fontWeight: '600',
    color: '#0a0a0a',
    letterSpacing: 0.1,
  },
});
