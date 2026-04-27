import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createStyles, spacing } from '@/lib/theme';

type Props = {
  onApple?: () => void;
  onGoogle?: () => void;
  /** "row" (default): two buttons side-by-side. "stack": full-width stacked. */
  layout?: 'row' | 'stack';
};

export function SocialAuthButtons({ onApple, onGoogle, layout = 'stack' }: Props) {
  const styles = useStyles();
  const showApple = Platform.OS === 'ios';
  const containerStyle = layout === 'row' ? styles.row : styles.stack;
  const btnStyle = layout === 'row' ? styles.btnRow : styles.btnStack;
  const appleLabel = layout === 'row' ? 'Apple' : 'Continue with Apple';
  const googleLabel = layout === 'row' ? 'Google' : 'Continue with Google';

  return (
    <View style={containerStyle}>
      {showApple && (
        <Pressable
          onPress={onApple}
          style={({ pressed }) => [styles.appleBtn, btnStyle, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Continue with Apple"
        >
          <Ionicons name="logo-apple" size={18} color="#000" style={styles.iconLeft} />
          <Text style={styles.appleText}>{appleLabel}</Text>
        </Pressable>
      )}
      <Pressable
        onPress={onGoogle}
        style={({ pressed }) => [styles.googleBtn, btnStyle, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
      >
        <Ionicons name="logo-google" size={18} color="#EA4335" style={styles.iconLeft} />
        <Text style={styles.googleText}>{googleLabel}</Text>
      </Pressable>
    </View>
  );
}

const useStyles = createStyles((c) => ({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stack: {
    gap: spacing.sm,
  },
  btnRow: {
    flex: 1,
  },
  btnStack: {
    width: '100%',
  },
  appleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  appleText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  googleText: {
    color: c.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  iconLeft: {
    marginRight: 8,
  },
  pressed: { opacity: 0.85 },
}));
