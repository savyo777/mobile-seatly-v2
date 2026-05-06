import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ClockGlyph } from '@/components/storyFilters/glyphs';
import { StoryWatermark } from '@/components/storyFilters/StoryWatermark';
import {
  FONT_BODY_SERIF_ITALIC,
  FONT_MONO,
  FONT_SANS,
} from '@/lib/storyFilters/fonts';
import type { StoryFilterProps } from '@/lib/storyFilters/types';

function formatEasternCaptureTime(capturedAt?: number): string {
  const date = new Date(capturedAt ?? Date.now());
  try {
    const time = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
    return `${time} EST`;
  } catch {
    return `${date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })} EST`;
  }
}

export function CocktailHour({ width, capturedAt }: StoryFilterProps) {
  const s = width / 224;
  const captureTime = formatEasternCaptureTime(capturedAt);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.clock, { gap: 5 * s }]}>
        <ClockGlyph size={11 * s} />
        <Text style={[styles.clockText, { fontSize: 9 * s }]}>{captureTime}</Text>
      </View>

      <View style={styles.label}>
        <Text style={[styles.title, { fontSize: 13 * s }]}>Cocktail Hour</Text>
        <Text style={[styles.sub, { fontSize: 8 * s }]}>· APERITIF ·</Text>
      </View>

      <StoryWatermark position="tr" />
    </View>
  );
}

const styles = StyleSheet.create({
  clock: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockText: {
    fontFamily: FONT_MONO,
    color: '#fff',
    letterSpacing: 0.4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  label: {
    position: 'absolute',
    left: 14,
    bottom: 14,
  },
  title: {
    fontFamily: FONT_BODY_SERIF_ITALIC,
    fontStyle: 'italic',
    fontWeight: '500',
    color: '#f0d49a',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  sub: {
    marginTop: 2,
    fontFamily: FONT_SANS,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2.4,
  },
});
