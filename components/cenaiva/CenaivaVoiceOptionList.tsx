import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  CENAIVA_TTS_VOICE_OPTIONS,
  type CenaivaTtsVoice,
} from '@/lib/cenaiva/voice/voicePreference';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

type Props = {
  selectedVoice: CenaivaTtsVoice | null;
  disabled?: boolean;
  onSelect: (voice: CenaivaTtsVoice) => void;
};

const useStyles = createStyles((c) => ({
  group: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  rowPressed: {
    backgroundColor: c.bgElevated,
  },
  rowDisabled: {
    opacity: 0.6,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: 4,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: c.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkFilled: {
    backgroundColor: c.gold,
  },
}));

function iconForVoice(voice: CenaivaTtsVoice): React.ComponentProps<typeof Ionicons>['name'] {
  return voice === 'female' ? 'woman-outline' : 'man-outline';
}

export function CenaivaVoiceOptionList({ selectedVoice, disabled, onSelect }: Props) {
  const c = useColors();
  const styles = useStyles();

  return (
    <View style={styles.group}>
      {CENAIVA_TTS_VOICE_OPTIONS.map((option, index) => {
        const active = selectedVoice === option.value;
        return (
          <Pressable
            key={option.value}
            disabled={disabled}
            onPress={() => onSelect(option.value)}
            style={({ pressed }) => [
              styles.row,
              index < CENAIVA_TTS_VOICE_OPTIONS.length - 1 && styles.rowBorder,
              pressed && !disabled && styles.rowPressed,
              disabled && styles.rowDisabled,
            ]}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={iconForVoice(option.value)} size={20} color={c.textSecondary} />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.title}>{option.label}</Text>
              <Text style={styles.subtitle}>{option.subtitle}</Text>
            </View>
            <View style={[styles.check, active && styles.checkFilled]}>
              {active ? <Ionicons name="checkmark" size={13} color={c.bgBase} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
