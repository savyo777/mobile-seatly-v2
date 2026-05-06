/**
 * <StoryFilterPicker /> — horizontal carousel users swipe to choose a filter.
 *
 * Layout is intentionally tiny (60×84 chips) so it never competes with the
 * photo. Each chip shows a mini-frame (the dish photo + the filter render
 * scaled down via `transform:scale`) so users can preview before applying.
 *
 * Tap a chip to apply; tap the leftmost "Original" chip to remove. The
 * active id gets a gold ring.
 */
import React, { useCallback, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { ImageBackground } from 'react-native';
import { STORY_FILTERS } from '@/lib/storyFilters/registry';
import type { StoryFilterId } from '@/lib/storyFilters/types';

const CHIP_W = 60;
const CHIP_H = 84;
const SCALE = 0.27; // chip preview is 60/224 ≈ 0.27 of the design frame

export type StoryFilterPickerProps = {
  selectedId: StoryFilterId | null;
  onChange: (id: StoryFilterId | null) => void;
  /** Sample photo to render inside each preview chip. */
  previewPhoto?: string;
  previewSource?: ImageSourcePropType;
};

export function StoryFilterPicker({
  selectedId,
  onChange,
  previewPhoto,
  previewSource,
}: StoryFilterPickerProps) {
  const scrollRef = useRef<ScrollView>(null);

  const onPick = useCallback(
    (id: StoryFilterId) => {
      // Tap selected = remove (matches Snapchat / Insta behaviour).
      onChange(selectedId === id ? null : id);
    },
    [onChange, selectedId],
  );

  const photoSrc: ImageSourcePropType | undefined =
    previewSource ?? (previewPhoto ? { uri: previewPhoto } : undefined);

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {/* "Original" chip */}
        <Pressable
          onPress={() => onChange(null)}
          style={({ pressed }) => [styles.chipHit, pressed && styles.pressed]}
        >
          <View style={[styles.chip, !selectedId && styles.chipActive]}>
            {photoSrc ? (
              <ImageBackground source={photoSrc} style={styles.chipPhoto} />
            ) : (
              <View style={[styles.chipPhoto, { backgroundColor: '#1a140e' }]} />
            )}
            <View style={styles.dashedNone}>
              <Text style={styles.dashedText}>none</Text>
            </View>
          </View>
          <Text style={[styles.label, !selectedId && styles.labelActive]} numberOfLines={1}>
            Original
          </Text>
        </Pressable>

        {STORY_FILTERS.map((entry) => {
          const active = entry.id === selectedId;
          return (
            <Pressable
              key={entry.id}
              onPress={() => onPick(entry.id)}
              style={({ pressed }) => [styles.chipHit, pressed && styles.pressed]}
            >
              <View style={[styles.chip, active && styles.chipActive]}>
                {photoSrc ? (
                  <ImageBackground source={photoSrc} style={styles.chipPhoto} />
                ) : (
                  <View style={[styles.chipPhoto, { backgroundColor: '#1a140e' }]} />
                )}
                {/* Render the actual filter component, scaled down to chip size. */}
                <View style={styles.chipScale} pointerEvents="none">
                  <entry.Component width={224} height={398} />
                </View>
              </View>
              <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                {entry.shortLabel}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 12,
  },
  row: {
    paddingHorizontal: 14,
    gap: 12,
  },
  chipHit: {
    width: CHIP_W,
    alignItems: 'center',
  },
  chip: {
    width: CHIP_W,
    height: CHIP_H,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: '#0c0a08',
    position: 'relative',
  },
  chipActive: {
    borderColor: '#c9a86a',
  },
  chipPhoto: {
    ...StyleSheet.absoluteFillObject,
  },
  /* Render full 224×398 filter, then scale down so it visually fits the chip. */
  chipScale: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 224,
    height: 398,
    transform: [{ scale: SCALE }],
    transformOrigin: 'top left',
  },
  dashedNone: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.32)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashedText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  label: {
    marginTop: 5,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  labelActive: {
    color: '#c9a86a',
    fontWeight: '700',
  },
  pressed: { opacity: 0.85 },
});
