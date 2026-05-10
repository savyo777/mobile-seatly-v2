import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { brandGold } from '@/lib/theme/tokens';

type Props = {
  size?: number;
  thickness?: number;
  length?: number;
  pulse?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Four L-shaped gold brackets framing a viewfinder area. Used over the
 * camera preview on the receipt-scanner capture screen. When `pulse` is
 * true the brackets breathe between full opacity and ~55% over ~1.6s,
 * giving the camera a "precision instrument" feel rather than a generic
 * camera frame.
 */
export function CornerBrackets({
  size,
  thickness = 2,
  length = 24,
  pulse = true,
  style,
}: Props) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (pulse) {
      opacity.value = withRepeat(
        withTiming(0.55, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else {
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [pulse, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const color = brandGold.dark;
  const horizArm: ViewStyle = { width: length, height: thickness, backgroundColor: color };
  const vertArm: ViewStyle = { width: thickness, height: length, backgroundColor: color };

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.frame, size != null ? { width: size, height: size } : null, animatedStyle, style]}
    >
      <View style={[styles.corner, styles.tl]}>
        <View style={[horizArm, styles.tlH]} />
        <View style={[vertArm, styles.tlV]} />
      </View>
      <View style={[styles.corner, styles.tr]}>
        <View style={[horizArm, styles.trH]} />
        <View style={[vertArm, styles.trV]} />
      </View>
      <View style={[styles.corner, styles.bl]}>
        <View style={[horizArm, styles.blH]} />
        <View style={[vertArm, styles.blV]} />
      </View>
      <View style={[styles.corner, styles.br]}>
        <View style={[horizArm, styles.brH]} />
        <View style={[vertArm, styles.brV]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
  },
  tl: { top: 0, left: 0 },
  tr: { top: 0, right: 0 },
  bl: { bottom: 0, left: 0 },
  br: { bottom: 0, right: 0 },
  tlH: { position: 'absolute', top: 0, left: 0 },
  tlV: { position: 'absolute', top: 0, left: 0 },
  trH: { position: 'absolute', top: 0, right: 0 },
  trV: { position: 'absolute', top: 0, right: 0 },
  blH: { position: 'absolute', bottom: 0, left: 0 },
  blV: { position: 'absolute', bottom: 0, left: 0 },
  brH: { position: 'absolute', bottom: 0, right: 0 },
  brV: { position: 'absolute', bottom: 0, right: 0 },
});
