/**
 * <StoryWatermark /> — the subtle "by Cenaiva" tag every story filter ships.
 *
 * Reference rule: Inter, white, with an italic Cormorant
 * "by" prefix. Sits in either the top-right or the bottom-left corner so
 * each filter can pick whichever doesn't collide with its own typography.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  FONT_BODY_SERIF_ITALIC,
  FONT_SANS,
} from '@/lib/storyFilters/fonts';

export type StoryWatermarkProps = {
  position?: 'tr' | 'bl';
};

export function StoryWatermark({ position = 'tr' }: StoryWatermarkProps) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrap,
        position === 'tr' ? styles.tr : styles.bl,
      ]}
    >
      <Text style={styles.italic}>by</Text>
      <Text style={styles.label}> Cenaiva</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 8,
  },
  tr: { top: 10, right: 12 },
  bl: { bottom: 10, left: 12 },
  italic: {
    fontFamily: FONT_BODY_SERIF_ITALIC,
    fontStyle: 'italic',
    fontWeight: '700',
    fontSize: 12,
    color: 'rgba(255,255,255,0.82)',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginRight: 1,
  },
  label: {
    fontFamily: FONT_SANS,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.82)',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
