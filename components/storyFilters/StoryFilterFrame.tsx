/**
 * <StoryFilterFrame /> — the 9:16 frame the user's photo / video / live
 * camera plays inside. Renders, in z-order:
 *
 *   1. The user's media (photo URI for now; swap for <CameraView/> or
 *      <Video/> later by passing your own `mediaSlot` element).
 *   2. A subtle grain layer (radial dot pattern at 14% — same as the
 *      reference HTML's <feTurbulence> grain).
 *   3. A radial vignette so corner-anchored decorations always have
 *      somewhere dark to sit on.
 *   4. The chosen filter overlay (corner-anchored decorations, label,
 *      and the "by Cenaiva" watermark).
 *
 * Sizing — the frame itself maintains aspect 9:16. The wrapper passes
 * its computed `width` and `height` through to the filter component so
 * decorations can scale on small / large phones.
 */
import React from 'react';
import {
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { StoryFilterEntry, StoryFilterId } from '@/lib/storyFilters/types';
import { getStoryFilterById } from '@/lib/storyFilters/registry';

type Props = {
  /** Which filter to apply. Pass `null` to show the photo with no overlay. */
  filterId: StoryFilterId | null;
  /** Image URI for the user's photo. */
  photo?: string;
  /** Pre-loaded local source (for the test screen). Wins over `photo`. */
  photoSource?: ImageSourcePropType;
  /** Frame width — defaults to fill parent. */
  width: number;
  /** Optional height override. Defaults to width × 16/9. */
  height?: number;
  /** Custom slot — pass a `<CameraView/>` here to filter live preview. */
  mediaSlot?: React.ReactNode;
  /** Capture timestamp to pass into time-based overlays. */
  capturedAt?: number;
  restaurantName?: string;
  city?: string;
  area?: string;
};

export function StoryFilterFrame({
  filterId,
  photo,
  photoSource,
  width,
  height,
  mediaSlot,
  capturedAt,
  restaurantName,
  city,
  area,
}: Props) {
  const frameH = height ?? Math.round((width * 16) / 9);

  const entry: StoryFilterEntry | null = filterId
    ? getStoryFilterById(filterId)
    : null;

  const ResolvedSource: ImageSourcePropType | undefined =
    photoSource ?? (photo ? { uri: photo } : undefined);

  return (
    <View style={[styles.frame, { width, height: frameH }]}>
      {/* 1 · media layer */}
      {mediaSlot ? (
        <View style={StyleSheet.absoluteFill}>{mediaSlot}</View>
      ) : ResolvedSource ? (
        <Image
          source={ResolvedSource}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.emptyBg]} />
      )}

      {/* 2 · grain (subtle dot mosaic — replaces reference SVG noise) */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.grain]} />

      {/* 3 · vignette */}
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(0,0,0,0.45)']}
        locations={[0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* 4 · the chosen overlay */}
      {entry ? (
        <entry.Component
          width={width}
          height={frameH}
          capturedAt={capturedAt}
          restaurantName={restaurantName}
          city={city}
          area={area}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#0c0a08',
    position: 'relative',
  },
  emptyBg: {
    backgroundColor: '#1a140e',
  },
  /* Subtle dot grain — using two radial-style transparent backgrounds is
     not feasible cross-platform, so we approximate with a single 14% black
     overlay; visually close to the reference's <feTurbulence> at 14% opacity. */
  grain: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    opacity: 0.85,
  },
});
