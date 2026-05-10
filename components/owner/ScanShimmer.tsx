import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { brandGold, withAlpha } from '@/lib/theme/tokens';

type Props = {
  active: boolean;
  height?: number;
};

/**
 * A vertical gold sweep-line that travels top→bottom across its container
 * exactly once when `active` is true, then loops while still active. Used
 * over the captured receipt thumbnail and over the form skeleton during
 * AI extraction. Disappears instantly when `active` flips to false.
 */
export function ScanShimmer({ active, height = 80 }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (active) {
      progress.value = 0;
      progress.value = withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        -1,
        false,
      );
    } else {
      progress.value = withTiming(0, { duration: 200 });
    }
  }, [active, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: active ? 1 : 0,
    transform: [
      {
        translateY: progress.value * 320 - 80,
      },
    ],
  }));

  if (!active) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.line, { height }, animatedStyle]}>
        <LinearGradient
          colors={[
            withAlpha(brandGold.dark, 0),
            withAlpha(brandGold.dark, 0.42),
            withAlpha(brandGold.dark, 0),
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
