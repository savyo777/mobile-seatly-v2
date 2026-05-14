/**
 * <SnapFilterPicker /> — the iOS-Camera-style horizontal filter carousel:
 *
 *   - white-ringed centred chip
 *   - small side chips that scale up natively as they pass the centre line
 *   - black filter-name pill below the carousel that cross-fades on selection
 *
 * Used on both the live-camera screen (selecting before capture) and the
 * post-capture style screen (re-applying a filter to an existing photo).
 *
 * `selectedFilterId` is controlled; the picker calls `onChangeSelected` every
 * time the centred chip changes (live, while scrolling).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { STORY_FILTERS } from '@/lib/storyFilters/registry';
import {
  type StoryFilterCategory,
  type StoryFilterEntry,
  type StoryFilterId,
} from '@/lib/storyFilters/types';

const CHIP_SIZE = 52;
const SIDE_SCALE = 26 / 52;
const CHIP_GAP = 14;
const CHIP_STRIDE = CHIP_SIZE + CHIP_GAP;
const RING_SIZE = CHIP_SIZE + 8;

const FRAME_REF_W = 224;
const FRAME_REF_H = 398;
const CHIP_FILTER_SCALE = CHIP_SIZE / FRAME_REF_W;

type FilterItem =
  | { kind: 'original'; id: '__none__'; categoryId: null }
  | {
      kind: 'filter';
      id: StoryFilterId;
      categoryId: StoryFilterCategory;
      entry: StoryFilterEntry;
    };

const FILTER_ITEMS: FilterItem[] = [
  { kind: 'original', id: '__none__', categoryId: null },
  ...STORY_FILTERS.map<FilterItem>((f) => ({
    kind: 'filter',
    id: f.id,
    categoryId: f.category,
    entry: f,
  })),
];

export type SnapFilterPickerProps = {
  selectedFilterId: StoryFilterId | null;
  onChangeSelected: (id: StoryFilterId | null) => void;
  /** Distance from the bottom of the parent for the carousel. */
  carouselBottom: number;
  /** Distance from the bottom of the parent for the filter-name pill. */
  pillBottom: number;
  /** Window width — used for snap-to-centre padding. */
  windowW: number;
  /** Optional photo URI to render as the chip background. Falls back to dark placeholder. */
  photoUri?: string;
  /** Forwarded to each filter component. */
  capturedAt?: number;
  restaurantName?: string;
  city?: string;
  area?: string;
  /** Fired when the user taps the chip that's already centred — used to trigger capture. */
  onCapture?: () => void;
};

export function SnapFilterPicker({
  selectedFilterId,
  onChangeSelected,
  carouselBottom,
  pillBottom,
  windowW,
  photoUri,
  capturedAt,
  restaurantName,
  city,
  area,
  onCapture,
}: SnapFilterPickerProps) {
  const listRef = useRef<FlatList<FilterItem>>(null);

  // Sync the externally controlled filter id to a centred-index that drives
  // the carousel's initial scroll position and the filter-name pill text.
  const initialIndex = useMemo(() => {
    if (!selectedFilterId) return 0;
    const i = FILTER_ITEMS.findIndex(
      (it) => it.kind === 'filter' && it.id === selectedFilterId,
    );
    return i >= 0 ? i : 0;
  }, [selectedFilterId]);

  const [centeredIndex, setCenteredIndex] = useState(initialIndex);
  const centeredItem = FILTER_ITEMS[centeredIndex] ?? FILTER_ITEMS[0];
  const currentFilterPillText =
    centeredItem.kind === 'original'
      ? 'ORIGINAL'
      : centeredItem.entry.name.toUpperCase();

  const carouselSidePad = Math.max(0, (windowW - CHIP_STRIDE) / 2);

  const scrollX = useRef(new Animated.Value(0)).current;

  const pillOpacity = useRef(new Animated.Value(1)).current;
  const lastPillFilterIdRef = useRef<StoryFilterId | null | 'init'>('init');
  const currentFilterId: StoryFilterId | null =
    centeredItem.kind === 'filter' ? centeredItem.id : null;
  useEffect(() => {
    if (lastPillFilterIdRef.current === 'init') {
      lastPillFilterIdRef.current = currentFilterId;
      return;
    }
    if (lastPillFilterIdRef.current !== currentFilterId) {
      lastPillFilterIdRef.current = currentFilterId;
      pillOpacity.setValue(0);
      Animated.timing(pillOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [currentFilterId, pillOpacity]);

  // Bubble selection changes up to the parent.
  useEffect(() => {
    onChangeSelected(currentFilterId);
    // We only want to fire this when the centred index actually changes,
    // not on every parent re-render — disable the lint that wants
    // onChangeSelected here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFilterId]);

  const handleScrollListener = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.max(
        0,
        Math.min(FILTER_ITEMS.length - 1, Math.round(x / CHIP_STRIDE)),
      );
      setCenteredIndex((prev) => (prev === i ? prev : i));
    },
    [],
  );

  const onScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: true, listener: handleScrollListener },
      ),
    [scrollX, handleScrollListener],
  );

  const onChipPress = useCallback(
    (index: number) => {
      if (index === centeredIndex && onCapture) {
        onCapture();
        return;
      }
      listRef.current?.scrollToOffset({
        offset: index * CHIP_STRIDE,
        animated: true,
      });
    },
    [centeredIndex, onCapture],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<FilterItem> | null | undefined, index: number) => ({
      length: CHIP_STRIDE,
      offset: CHIP_STRIDE * index,
      index,
    }),
    [],
  );

  const hasPhoto = !!photoUri && photoUri.length > 0;

  const renderChip = useCallback(
    ({ item, index }: { item: FilterItem; index: number }) => {
      const inputRange = [
        (index - 1) * CHIP_STRIDE,
        index * CHIP_STRIDE,
        (index + 1) * CHIP_STRIDE,
      ];
      const scale = scrollX.interpolate({
        inputRange,
        outputRange: [SIDE_SCALE, 1, SIDE_SCALE],
        extrapolate: 'clamp',
      });
      return (
        <Pressable
          onPress={() => onChipPress(index)}
          hitSlop={6}
          style={({ pressed }) => [
            styles.chipSlot,
            pressed && { opacity: 0.72 },
          ]}
        >
          <Animated.View style={[styles.chipCircle, { transform: [{ scale }] }]}>
            {hasPhoto ? (
              <Image
                source={{ uri: photoUri }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                contentPosition="bottom"
              />
            ) : (
              <View style={[StyleSheet.absoluteFillObject, styles.chipPlaceholder]} />
            )}
            {item.kind === 'filter' && (
              <View pointerEvents="none" style={styles.chipFilterOverlay}>
                <item.entry.Component
                  width={FRAME_REF_W}
                  height={FRAME_REF_H}
                  capturedAt={capturedAt}
                  restaurantName={restaurantName}
                  city={city}
                  area={area}
                />
              </View>
            )}
            {item.kind === 'original' && (
              <View pointerEvents="none" style={styles.chipNoneBadge}>
                <Ionicons
                  name="ban-outline"
                  size={20}
                  color="rgba(255,255,255,0.88)"
                />
              </View>
            )}
          </Animated.View>
        </Pressable>
      );
    },
    [
      scrollX,
      onChipPress,
      hasPhoto,
      photoUri,
      capturedAt,
      restaurantName,
      city,
      area,
    ],
  );

  return (
    <>
      {/* Black filter-name pill — sits below the carousel */}
      <Animated.View
        style={[styles.filterPill, { bottom: pillBottom, opacity: pillOpacity }]}
        pointerEvents="none"
      >
        <Text style={styles.filterPillText} numberOfLines={1}>
          {currentFilterPillText}
        </Text>
      </Animated.View>

      {/* Carousel + gold centre ring */}
      <View
        style={[styles.carouselWrap, { bottom: carouselBottom }]}
        pointerEvents="box-none"
      >
        <View pointerEvents="none" style={styles.centerRing} />
        <Animated.FlatList
          ref={listRef}
          data={FILTER_ITEMS}
          horizontal
          keyExtractor={(it) => it.id}
          renderItem={renderChip}
          getItemLayout={getItemLayout}
          initialScrollIndex={initialIndex}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: carouselSidePad }}
          snapToInterval={CHIP_STRIDE}
          decelerationRate="fast"
          onScroll={onScroll}
          scrollEventThrottle={16}
          bounces={false}
          initialNumToRender={9}
          windowSize={5}
          removeClippedSubviews={false}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  filterPill: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    maxWidth: '70%',
  },
  filterPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  carouselWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: RING_SIZE,
    justifyContent: 'center',
  },
  centerRing: {
    position: 'absolute',
    alignSelf: 'center',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    borderColor: '#c9a84c',
    shadowColor: '#c9a84c',
    shadowOpacity: 0.5,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  chipSlot: {
    width: CHIP_STRIDE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCircle: {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: CHIP_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#111',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  chipPlaceholder: {
    backgroundColor: '#1a1410',
  },
  chipFilterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: FRAME_REF_W,
    height: FRAME_REF_H,
    transform: [{ scale: CHIP_FILTER_SCALE }],
    transformOrigin: 'top left',
  },
  chipNoneBadge: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
});
