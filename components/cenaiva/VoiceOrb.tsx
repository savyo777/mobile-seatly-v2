import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createStyles, borderRadius, shadows, spacing, typography, useColors } from '@/lib/theme';
import type { AssistantState } from '@/lib/cenaiva/state/assistantStore';

const useStyles = createStyles((c) => ({
  wrap: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  orb: {
    width: 74,
    height: 74,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.gold,
    ...shadows.goldGlow,
  },
  orbMuted: {
    backgroundColor: c.bgElevated,
    borderWidth: 1,
    borderColor: c.border,
    shadowOpacity: 0,
  },
  status: {
    ...typography.bodySmall,
    color: c.textSecondary,
    fontWeight: '700',
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
      return 'Tap to talk';
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
  return (
    <View style={styles.wrap}>
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
        <Ionicons
          name={status === 'listening' ? 'mic' : status === 'processing' ? 'sparkles' : 'mic-outline'}
          size={30}
          color={active ? c.bgBase : c.gold}
        />
      </Pressable>
      <Text style={styles.status}>{labelForStatus(status)}</Text>
    </View>
  );
}
