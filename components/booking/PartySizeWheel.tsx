import React, { useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, createStyles, useColors } from '@/lib/theme';

const MIN = 1;
const MAX = 20;

interface Props {
  value: number;
  onChange: (size: number) => void;
  compact?: boolean;
}

const useStyles = createStyles((c) => ({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
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
    backgroundColor: c.bgElevated,
    borderWidth: 1,
    borderColor: c.border,
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
    color: c.textPrimary,
    lineHeight: 36,
  },
  countCompact: {
    fontSize: 22,
    lineHeight: 26,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: c.textMuted,
  },
}));

export function PartySizeWheel({ value, onChange, compact = false }: Props) {
  const c = useColors();
  const styles = useStyles();

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
        <Ionicons name="remove" size={22} color={value <= MIN ? c.textMuted : c.textPrimary} />
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
        <Ionicons name="add" size={22} color={value >= MAX ? c.textMuted : c.textPrimary} />
      </Pressable>
    </View>
  );
}
