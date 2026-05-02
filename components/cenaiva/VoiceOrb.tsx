import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createStyles, borderRadius, shadows, spacing, typography, useColors } from '@/lib/theme';
import type { AssistantState } from '@/lib/cenaiva/state/assistantStore';

const useStyles = createStyles((c) => ({
  wrap: {
    alignItems: 'center',
    gap: spacing.xs,
    width: 104,
  },
  stage: {
    width: 98,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(201,162,74,0.44)',
    backgroundColor: 'rgba(201,162,74,0.10)',
  },
  pulseRingOuter: {
    width: 98,
    height: 98,
    borderColor: 'rgba(201,162,74,0.20)',
    backgroundColor: 'rgba(201,162,74,0.04)',
  },
  orb: {
    width: 76,
    height: 76,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.goldGlow,
  },
  orbMuted: {
    borderWidth: 1,
    borderColor: c.border,
    shadowOpacity: 0,
  },
  orbInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassHighlight: {
    position: 'absolute',
    top: 9,
    width: 34,
    height: 10,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  bars: {
    position: 'absolute',
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  bar: {
    width: 3,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  mutedBar: {
    backgroundColor: c.gold,
  },
  status: {
    ...typography.bodySmall,
    color: c.textSecondary,
    fontWeight: '700',
    minHeight: 16,
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
  const c = useColors();
  const styles = useStyles();
  const active = status === 'listening' || status === 'processing' || status === 'speaking';
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
          duration: status === 'processing' ? 860 : 1_150,
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
    outputRange: [0.42, 0],
  });
  const ringScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1.22],
  });
  const iconName =
    status === 'listening' ? 'mic' : status === 'processing' ? 'sparkles' : 'mic-outline';
  const gradientColors = active
    ? ([c.goldLight, c.gold, c.goldDark] as const)
    : (['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.02)'] as const);

  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        {active ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pulseRing,
                styles.pulseRingOuter,
                { opacity: ringOpacity, transform: [{ scale: ringScale }] },
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[styles.pulseRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
            />
          </>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={labelForStatus(status)}
          onPress={onPress}
          disabled={status === 'processing'}
          style={({ pressed }) => [
            styles.orb,
            !active && styles.orbMuted,
            pressed && { opacity: 0.82, transform: [{ scale: 0.96 }] },
          ]}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0.18, y: 0.02 }}
            end={{ x: 0.82, y: 1 }}
            style={styles.orbInner}
          >
            <View style={styles.glassHighlight} />
            <Ionicons name={iconName} size={30} color={active ? c.bgBase : c.gold} />
            {status === 'listening' || status === 'speaking' ? (
              <View style={styles.bars} pointerEvents="none">
                {[10, 16, 12].map((height) => (
                  <View
                    key={height}
                    style={[styles.bar, !active && styles.mutedBar, { height }]}
                  />
                ))}
              </View>
            ) : null}
          </LinearGradient>
        </Pressable>
      </View>
      <Text style={styles.status}>{labelForStatus(status)}</Text>
    </View>
  );
}
