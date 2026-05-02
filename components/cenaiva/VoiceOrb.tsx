import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createStyles, borderRadius } from '@/lib/theme';
import type { AssistantState } from '@/lib/cenaiva/state/assistantStore';

const useStyles = createStyles(() => ({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
  },
  pulseRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: 'rgba(232,200,122,0.42)',
  },
  orb: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#C8A951',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.34,
    shadowRadius: 18,
    elevation: 8,
  },
  orbInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

function labelForStatus(status: AssistantState['voiceStatus']) {
  switch (status) {
    case 'listening':
      return 'Listening';
    case 'processing':
      return 'Thinking';
    case 'speaking':
      return 'Speaking';
    case 'error':
      return 'Voice unavailable';
    default:
      return 'Ready';
  }
}

export function VoiceOrb({
  status,
  onPress,
}: {
  status: AssistantState['voiceStatus'];
  onPress: () => void;
}) {
  const styles = useStyles();
  const active = status === 'listening' || status === 'speaking';
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return undefined;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1_200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse, status]);

  const ringOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.46, 0],
  });
  const ringScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, status === 'speaking' ? 1.6 : 1.16],
  });
  const iconName =
    status === 'listening' ? 'mic-off-outline' : 'mic-outline';
  const gradientColors =
    status === 'speaking'
      ? (['#C8A951', '#E8C87A'] as const)
      : status === 'processing'
        ? (['#A68B3E', '#C8A951'] as const)
        : status === 'error'
          ? (['#EF4444', '#B91C1C'] as const)
          : status === 'listening'
            ? (['#C8A951', '#E6C060'] as const)
            : (['#C8A951', '#A68B3E'] as const);

  return (
    <View style={styles.wrap}>
      {active ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={[styles.pulseRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
          />
          {status === 'speaking' ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.pulseRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
            />
          ) : null}
        </>
      ) : null}
      {status === 'listening' ? <View pointerEvents="none" style={styles.pulseRing} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={labelForStatus(status)}
        onPress={onPress}
        disabled={status === 'processing'}
        style={({ pressed }) => [
          styles.orb,
          pressed && status !== 'processing' && { opacity: 0.82, transform: [{ scale: 0.95 }] },
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0.12, y: 0.08 }}
          end={{ x: 0.88, y: 0.92 }}
          style={styles.orbInner}
        >
          {status === 'processing' ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Ionicons name={iconName} size={27} color="#000000" />
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}
