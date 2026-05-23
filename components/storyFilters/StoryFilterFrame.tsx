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
  type ViewStyle,
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
  /** Override container style — e.g. pass `{ borderRadius: 0 }` for full-screen. */
  containerStyle?: ViewStyle;
  /**
   * Optional safe inset applied ONLY to the filter overlay layer, so corner
   * decorations don't get clipped by chrome (bottom carousel etc.) when the
   * frame is rendered at a non-9:16 aspect (e.g. full-screen 9:19.5).
   * Photo, grain, and vignette layers remain unclipped.
   */
  overlayInsets?: { top?: number; right?: number; bottom?: number; left?: number };
  /**
   * Letterbox the photo + overlays inside the frame. Values are FRACTIONS
   * of frameH (e.g. 0.08 = 8% black bar). Opt-in: defaults to {0,0} so
   * full-screen editor screens like styles.tsx render edge-to-edge on
   * the user's device. The CAPTURE-TARGET wrapper in post-review/connect
   * passes ~{top: 0.08, bottom: 0.04} so the snapped JPEG, when
   * re-displayed on an iPhone story-style viewer, doesn't get its
   * content clipped by the Dynamic Island (top) or Home Indicator
   * (bottom). User-reported 2026-05-23 (image #58 reference).
   */
  safeAreaInsetRatio?: { top: number; bottom: number };
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
  containerStyle,
  overlayInsets,
  safeAreaInsetRatio = { top: 0, bottom: 0 },
}: Props) {
  const overlayTop = overlayInsets?.top ?? 0;
  const overlayRight = overlayInsets?.right ?? 0;
  const overlayBottom = overlayInsets?.bottom ?? 0;
  const overlayLeft = overlayInsets?.left ?? 0;
  const frameH = height ?? Math.round((width * 16) / 9);
  const safeTop = Math.round(frameH * Math.max(0, safeAreaInsetRatio.top));
  const safeBottom = Math.round(frameH * Math.max(0, safeAreaInsetRatio.bottom));
  const innerH = Math.max(1, frameH - safeTop - safeBottom);

  const entry: StoryFilterEntry | null = filterId
    ? getStoryFilterById(filterId)
    : null;

  const ResolvedSource: ImageSourcePropType | undefined =
    photoSource ?? (photo ? { uri: photo } : undefined);

  // The inner-content area: photo + grain + vignette + overlay all live
  // here. The outer frame's black background fills the top+bottom safe
  // strips → that's the letterbox the user wanted (2026-05-23 request:
  // shared snaps should not have the Dynamic Island or Home Indicator
  // sitting over the photo content when re-displayed on iPhone story
  // viewers).
  const innerContent = (
    <>
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

      {/* 4 · the chosen overlay — clamped to the safe overlay region.
            overlayInsets here are relative to the INNER content area,
            not the outer frame, so corner decorations stay flush to the
            visible photo edges rather than the letterbox bars. */}
      {entry ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: overlayTop,
            left: overlayLeft,
            right: overlayRight,
            bottom: overlayBottom,
          }}
        >
          <entry.Component
            width={width - overlayLeft - overlayRight}
            height={innerH - overlayTop - overlayBottom}
            capturedAt={capturedAt}
            restaurantName={restaurantName}
            city={city}
            area={area}
          />
        </View>
      ) : null}
    </>
  );

  return (
    <View style={[styles.frame, { width, height: frameH }, containerStyle]}>
      {safeTop > 0 || safeBottom > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: safeTop,
            bottom: safeBottom,
            left: 0,
            right: 0,
          }}
        >
          {innerContent}
        </View>
      ) : (
        innerContent
      )}
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
