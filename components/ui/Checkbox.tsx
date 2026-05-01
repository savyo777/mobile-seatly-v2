import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createStyles, spacing, typography } from '@/lib/theme';

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string | React.ReactNode;
};

export function Checkbox({ checked, onChange, label }: Props) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={6}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <Ionicons name="checkmark" size={14} color="#0F0E0C" /> : null}
      </View>
      {typeof label === 'string' ? (
        <Text style={styles.label}>{label}</Text>
      ) : (
        label
      )}
    </Pressable>
  );
}

const useStyles = createStyles((c) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.gold,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: {
    backgroundColor: c.gold,
    borderColor: c.gold,
  },
  label: {
    ...typography.body,
    color: c.textSecondary,
  },
}));
