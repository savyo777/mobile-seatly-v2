import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, shadows } from '@/lib/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outlined' | 'danger' | 'dangerSoft' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = 'primary', size = 'md', loading = false, disabled = false, fullWidth = true, style }: ButtonProps) {
  const sizeStyles = {
    sm: { height: 40, paddingHorizontal: 16, fontSize: 13 },
    md: { height: 48, paddingHorizontal: 24, fontSize: 15 },
    lg: { height: 52, paddingHorizontal: 32, fontSize: 16 },
  };

  const s = sizeStyles[size];

  const variantStyles: Record<string, ViewStyle> = {
    primary: { backgroundColor: colors.gold, ...shadows.goldGlow },
    outlined: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.gold },
    danger: { backgroundColor: colors.danger },
    dangerSoft: { backgroundColor: 'rgba(220, 90, 90, 0.22)', borderWidth: 1, borderColor: 'rgba(220, 90, 90, 0.35)' },
    ghost: { backgroundColor: 'transparent' },
  };

  const textColors: Record<string, string> = {
    primary: colors.bgBase,
    outlined: colors.gold,
    danger: '#FFFFFF',
    dangerSoft: '#E8A0A0',
    ghost: colors.gold,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        variantStyles[variant],
        { height: s.height, paddingHorizontal: s.paddingHorizontal },
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColors[variant]} size="small" />
      ) : (
        <Text style={[styles.text, { color: textColors[variant], fontSize: s.fontSize }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
  },
});
