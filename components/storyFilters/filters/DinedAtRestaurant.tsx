import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PinGlyph } from '@/components/storyFilters/glyphs';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import {
  FONT_BODY_SERIF,
  FONT_SANS,
} from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function DinedAtRestaurant({ width, restaurantName }: StoryFilterProps) {
  const s = width / 224;
  const name = restaurantName?.trim() || 'This spot';

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.card,
          {
            paddingHorizontal: 12 * s,
            paddingVertical: 8 * s,
            gap: 7 * s,
          },
        ]}
      >
        <PinGlyph size={13 * s} />
        <View style={styles.copy}>
          <Text style={[styles.eyebrow, { fontSize: 8 * s }]}>Dined at</Text>
          <Text style={[styles.name, { fontSize: 13 * s }]} numberOfLines={1}>
            {name}
          </Text>
        </View>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    maxWidth: '86%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
  },
  copy: {
    flexShrink: 1,
  },
  eyebrow: {
    fontFamily: FONT_SANS,
    fontWeight: '700',
    color: '#7a766f',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: -1,
  },
  name: {
    fontFamily: FONT_BODY_SERIF,
    fontWeight: '700',
    color: '#0a0a0a',
    letterSpacing: 0.1,
  },
});
