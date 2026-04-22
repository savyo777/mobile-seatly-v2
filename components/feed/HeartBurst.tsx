import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/lib/theme';

interface Props {
  visible: boolean;
  onComplete: () => void;
}

export function HeartBurst({ visible, onComplete }: Props) {
  const c = useColors();
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0);
    opacity.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1.25, tension: 55, friction: 7, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
      ]),
      Animated.delay(240),
      Animated.parallel([
        Animated.spring(scale, { toValue: 0.8, tension: 80, friction: 12, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]),
    ]).start(({ finished }) => { if (finished) onComplete(); });
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.burst, { transform: [{ scale }], opacity }]}>
        <Ionicons name="heart" size={80} color={c.gold} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  burst: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
