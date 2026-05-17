import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
// expo-image honours EXIF rotation correctly on both iOS and Android, so a
// portrait shot stays portrait — react-native's <Image> sometimes ignores
// EXIF, which is what made captures appear horizontal here.
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StoryFilterFrame } from '@/components/storyFilters/StoryFilterFrame';
import { SnapFilterPicker, SNAP_FILTER_RING_SIZE } from '@/components/storyFilters/SnapFilterPicker';
import { type StoryFilterId } from '@/lib/storyFilters/types';
import { getSnapRestaurantName as DEMO_getSnapRestaurantName } from '@/lib/mock/snaps';
import { mockRestaurants as DEMO_RESTAURANTS } from '@/lib/mock/restaurants';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { captureStyledSnapToTmpFile } from '@/lib/snapOverlays/captureStyledSnap';
import { friendlyError } from '@/lib/errors/friendlyError';

const getSnapRestaurantName: typeof DEMO_getSnapRestaurantName = (id) =>
  isDemoModeEnabled() ? DEMO_getSnapRestaurantName(id) : '';
const mockRestaurants: typeof DEMO_RESTAURANTS = isDemoModeEnabled() ? DEMO_RESTAURANTS : [];

const CARD_FRAME_STYLE = { borderRadius: 0, backgroundColor: '#000' };

export default function SnapStylesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowW, height: windowH } = useWindowDimensions();
  const captureRefView = useRef<View>(null);

  const {
    restaurantId,
    photoUri,
    bookingId,
    capturedAt: capturedAtParam,
    returnTo,
    points: pointsParam,
    restaurantName: rewardRestaurantNameParam,
  } = useLocalSearchParams<{
    restaurantId?: string;
    photoUri?: string;
    bookingId?: string;
    capturedAt?: string;
    partySize?: string;
    returnTo?: string;
    points?: string;
    restaurantName?: string;
  }>();

  const returningToReward = returnTo === 'reward';

  const decodedUri = useMemo(() => {
    if (!photoUri) return '';
    try {
      return decodeURIComponent(photoUri);
    } catch {
      return photoUri;
    }
  }, [photoUri]);

  const capturedAt = useMemo(() => {
    const value = Number(capturedAtParam);
    return Number.isFinite(value) && value > 0 ? value : Date.now();
  }, [capturedAtParam]);

  const restaurant = useMemo(
    () => mockRestaurants.find((item) => item.id === restaurantId) ?? null,
    [restaurantId],
  );
  const selectedRestaurantName = useMemo(() => {
    if (restaurant?.name) return restaurant.name;
    if (restaurantId) return getSnapRestaurantName(restaurantId);
    return 'Restaurant';
  }, [restaurant?.name, restaurantId]);
  const selectedRestaurantCity = restaurant?.city ?? 'Toronto';
  const selectedRestaurantArea = restaurant?.area ?? selectedRestaurantCity;

  const [filterId, setFilterId] = useState<StoryFilterId | null>(null);
  const [busy, setBusy] = useState(false);

  const goDetails = useCallback(
    async (finalUri: string, preservedFilterId?: StoryFilterId | null) => {
      if (!restaurantId) return;
      const href: Href = {
        pathname: '/(customer)/discover/post-review/details',
        params: {
          photoUri: encodeURIComponent(finalUri),
          restaurantId,
          ...(bookingId ? { bookingId } : {}),
          ...(preservedFilterId
            ? { filterId: preservedFilterId, capturedAt: String(capturedAt) }
            : {}),
        },
      };
      router.push(href);
    },
    [bookingId, capturedAt, restaurantId, router],
  );

  const goReward = useCallback(
    (finalUri: string, preservedFilterId?: StoryFilterId | null) => {
      if (!restaurantId) return;
      router.replace({
        pathname: '/(customer)/discover/post-review/reward',
        params: {
          points: pointsParam ?? '25',
          restaurantName: rewardRestaurantNameParam ?? '',
          restaurantId,
          photoUri: encodeURIComponent(finalUri),
          ...(bookingId ? { bookingId } : {}),
          ...(preservedFilterId
            ? { filterId: preservedFilterId, capturedAt: String(capturedAt) }
            : {}),
        },
      });
    },
    [bookingId, capturedAt, restaurantId, router, pointsParam, rewardRestaurantNameParam],
  );

  const handleContinue = useCallback(async () => {
    if (!decodedUri || !restaurantId) {
      Alert.alert('Missing photo', 'Go back and choose a photo first.');
      return;
    }
    const finish = async (finalUri: string, preservedFilterId?: StoryFilterId | null) => {
      if (returningToReward) {
        goReward(finalUri, preservedFilterId);
        return;
      }
      await goDetails(finalUri, preservedFilterId);
    };
    if (!filterId) {
      await finish(decodedUri);
      return;
    }
    try {
      setBusy(true);
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      const uri = await captureStyledSnapToTmpFile(captureRefView);
      if (uri) {
        await finish(uri);
      } else {
        await finish(decodedUri, filterId);
      }
    } catch (e) {
      Alert.alert('Capture failed', friendlyError(e, 'Could not render your styled snap.'));
    } finally {
      setBusy(false);
    }
  }, [decodedUri, restaurantId, filterId, goDetails, returningToReward, goReward]);

  const hasImage = decodedUri.length > 0;

  const continueBottom = 0;
  const carouselBottom = 80;
  const pillBottom = carouselBottom + SNAP_FILTER_RING_SIZE + 8;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* ── CAPTURE TARGET: full-screen styled snap ── */}
      <View
        ref={captureRefView}
        collapsable={false}
        style={[StyleSheet.absoluteFillObject, { width: windowW, height: windowH }]}
      >
        <StoryFilterFrame
          filterId={filterId}
          width={windowW}
          height={windowH}
          capturedAt={capturedAt}
          restaurantName={selectedRestaurantName}
          city={selectedRestaurantCity}
          area={selectedRestaurantArea}
          mediaSlot={
            hasImage ? (
              <Image
                source={{ uri: decodedUri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                contentPosition="center"
              />
            ) : null
          }
          containerStyle={CARD_FRAME_STYLE}
        />
      </View>

      {/* ── Back button ── */}
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={[styles.backBtn, { top: insets.top + 10 }]}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </Pressable>

      {/* ── Screen title ── */}
      <Text style={[styles.title, { top: insets.top + 14 }]} numberOfLines={1}>
        {returningToReward ? 'Filters for sharing' : 'Style your snap'}
      </Text>

      {/* ── Filter picker (carousel + name pill) ── */}
      <SnapFilterPicker
        selectedFilterId={filterId}
        onChangeSelected={setFilterId}
        carouselBottom={carouselBottom}
        pillBottom={pillBottom}
        windowW={windowW}
        photoUri={hasImage ? decodedUri : undefined}
        capturedAt={capturedAt}
        restaurantName={selectedRestaurantName}
        city={selectedRestaurantCity}
        area={selectedRestaurantArea}
      />

      {/* ── Continue / Apply pill (bottom-right, gold) ── */}
      <Pressable
        onPress={() => void handleContinue()}
        disabled={!hasImage || !restaurantId || busy}
        style={({ pressed }) => [
          styles.continuePill,
          { bottom: continueBottom },
          (!hasImage || !restaurantId || busy) && styles.continuePillDisabled,
          pressed && styles.continuePillPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={returningToReward ? 'Apply' : 'Next'}
      >
        <Text style={styles.continuePillText}>
          {returningToReward ? 'Apply' : 'Next'}
        </Text>
        <Ionicons name="arrow-forward" size={18} color="#1a1410" />
      </Pressable>

      {/* ── Retake pill (bottom-left, paired with Next) ── */}
      {!returningToReward && (
        <Pressable
          onPress={() => router.back()}
          disabled={busy}
          style={({ pressed }) => [
            styles.retakePill,
            { bottom: continueBottom },
            busy && styles.continuePillDisabled,
            pressed && styles.continuePillPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Retake"
        >
          <Ionicons name="camera-reverse-outline" size={18} color="#fff" />
          <Text style={styles.retakePillText}>Retake</Text>
        </Pressable>
      )}

      {/* ── Busy capture overlay ── */}
      {busy && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.busyOverlay]}>
          <ActivityIndicator color="#c9a84c" size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    position: 'absolute',
    left: 64,
    right: 16,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  continuePill: {
    position: 'absolute',
    right: 16,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#c9a84c',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
  },
  continuePillDisabled: {
    opacity: 0.5,
  },
  continuePillPressed: {
    opacity: 0.85,
  },
  retakePill: {
    position: 'absolute',
    left: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  retakePillText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  continuePillText: {
    color: '#1a1410',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  busyOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});
