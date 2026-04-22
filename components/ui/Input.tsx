import React, { useState } from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, createStyles, borderRadius } from '@/lib/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

const useStyles = createStyles((c) => ({
  container: {
    marginBottom: 16,
  },
  label: {
    color: c.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.bgSurface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: borderRadius.md,
    height: 48,
    paddingHorizontal: 16,
  },
  inputFocused: {
    borderColor: c.gold,
  },
  inputError: {
    borderColor: c.danger,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: c.textPrimary,
    fontSize: 16,
  },
  eyeIcon: {
    marginLeft: 8,
  },
  error: {
    color: c.danger,
    fontSize: 12,
    marginTop: 4,
  },
}));

export function Input({ label, error, icon, isPassword, style, ...props }: InputProps) {
  const c = useColors();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, focused && styles.inputFocused, error && styles.inputError]}>
        {icon && (
          <Ionicons name={icon} size={20} color={focused ? c.gold : c.textMuted} style={styles.icon} />
        )}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={c.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={c.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}
