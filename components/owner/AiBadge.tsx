import React, { useEffect } from 'react';
import { Text, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useOwnerColors } from '@/lib/theme/ownerTheme';

type Props = {
  extracted: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Small gold ✨ glyph rendered next to the label of any field that the
 * receipt-scanner AI populated. Once the owner edits the field, the parent
 * flips `extracted` to false and the badge fades out — signaling that the
 * field has been "claimed" by the human.
 */
export function AiBadge({ extracted, size = 12, style }: Props) {
  const ownerColors = useOwnerColors();
  const opacity = useSharedValue(extracted ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(extracted ? 1 : 0, { duration: 240 });
  }, [extracted, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: 0.9 + opacity.value * 0.1 }],
  }));

  return (
    <Animated.View style={[styles.wrap, animatedStyle, style]} pointerEvents="none">
      <Text
        accessibilityLabel="AI suggested"
        style={{ color: ownerColors.gold, fontSize: size, lineHeight: size + 2 }}
      >
        {'✨'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
