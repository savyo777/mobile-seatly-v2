import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import {
  FONT_BODY_SERIF,
  FONT_MONO,
} from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

export function RestaurantLocationStamp({
  width,
  restaurantName,
  city,
  area,
}: StoryFilterProps) {
  const s = width / 224;
  const name = restaurantName?.trim() || 'Dinner spot';
  const location = [area, city].filter(Boolean).join(' · ') || 'Booked & Dined';

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.stamp,
          {
            paddingHorizontal: 12 * s,
            paddingVertical: 8 * s,
            transform: [{ rotate: '-3deg' }],
          },
        ]}
      >
        <Text style={[styles.eyebrow, { fontSize: 8 * s }]}>WHERE WE DINED</Text>
        <Text style={[styles.name, { fontSize: 14 * s }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.location, { fontSize: 8 * s }]} numberOfLines={1}>
          {location}
        </Text>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  stamp: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 18,
    maxWidth: '88%',
    borderRadius: 5,
    backgroundColor: 'rgba(245,241,236,0.96)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,0,0,0.3)',
    shadowColor: '#000',
    shadowOpacity: 0.34,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  eyebrow: {
    fontFamily: FONT_MONO,
    color: '#7a766f',
    letterSpacing: 1.7,
    textAlign: 'center',
  },
  name: {
    marginTop: 2,
    fontFamily: FONT_BODY_SERIF,
    fontWeight: '700',
    color: '#0a0a0a',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  location: {
    marginTop: 3,
    fontFamily: FONT_MONO,
    color: '#7a766f',
    letterSpacing: 0.8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
