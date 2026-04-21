import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/lib/theme';

const MIN = 1;
const MAX = 20;

interface Props {
  value: number;
  onChange: (size: number) => void;
  compact?: boolean;
}

export function PartySizeWheel({ value, onChange, compact = false }: Props) {
  const decrement = useCallback(() => {
    if (value > MIN) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value - 1);
    }
  }, [value, onChange]);

  const increment = useCallback(() => {
    if (value < MAX) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value + 1);
    }
  }, [value, onChange]);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Pressable
        onPress={decrement}
        disabled={value <= MIN}
        hitSlop={12}
        style={({ pressed }) => [
          styles.btn,
          pressed && { opacity: 0.6 },
          value <= MIN && styles.btnDisabled,
        ]}
      >
        <Ionicons name="remove" size={22} color={value <= MIN ? colors.textMuted : colors.textPrimary} />
      </Pressable>

      <View style={styles.center}>
        <Text style={[styles.count, compact && styles.countCompact]}>{value}</Text>
        <Text style={styles.label}>{value === 1 ? 'guest' : 'guests'}</Text>
      </View>

      <Pressable
        onPress={increment}
        disabled={value >= MAX}
        hitSlop={12}
        style={({ pressed }) => [
          styles.btn,
          pressed && { opacity: 0.6 },
          value >= MAX && styles.btnDisabled,
        ]}
      >
        <Ionicons name="add" size={22} color={value >= MAX ? colors.textMuted : colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flex: 1,
  },
  wrapCompact: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.35 },
  center: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  count: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 36,
  },
  countCompact: {
    fontSize: 22,
    lineHeight: 26,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
