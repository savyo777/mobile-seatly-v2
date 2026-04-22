import React, { useCallback } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { TimeSlotOption } from '@/lib/booking/availabilityTypes';
import { borderRadius, createStyles, spacing, useColors } from '@/lib/theme';

const SCREEN_W = Dimensions.get('window').width;
const H_PAD = 40; // 20px each side from parent
const GAP = 8;
const COLS = 3;
const PILL_W = (SCREEN_W - H_PAD - GAP * (COLS - 1)) / COLS;

interface Props {
  slots: TimeSlotOption[];
  selectedSlotId: string | null;
  onSelect: (slotId: string, label: string) => void;
  onNextDate?: () => void;
}

const useStyles = createStyles((c) => ({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  pill: {
    width: PILL_W,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    backgroundColor: c.bgSurface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSelected: {
    backgroundColor: c.gold,
    borderColor: c.gold,
  },
  pillUnavailable: {
    opacity: 0.3,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textPrimary,
  },
  pillTextSelected: {
    color: c.bgBase,
  },
  pillTextUnavailable: {
    color: c.textMuted,
  },
  empty: {
    paddingVertical: spacing['3xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    color: c.textMuted,
  },
  nextBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: c.border,
  },
  nextBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.gold,
  },
}));

export function TimeSlotWheel({ slots, selectedSlotId, onSelect, onNextDate }: Props) {
  const c = useColors();
  const styles = useStyles();
  const available = slots.filter((s) => s.available);

  const handlePress = useCallback(
    (slot: TimeSlotOption) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelect(slot.slotId, slot.label);
    },
    [onSelect],
  );

  if (slots.length === 0 || available.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="calendar-outline" size={36} color={c.textMuted} />
        <Text style={styles.emptyTitle}>No times available</Text>
        <Text style={styles.emptyText}>Try a different date or party size.</Text>
        {onNextDate && (
          <Pressable
            onPress={onNextDate}
            style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.nextBtnText}>Next available date →</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {slots.map((slot) => {
        const selected = slot.slotId === selectedSlotId;
        return (
          <Pressable
            key={slot.slotId}
            onPress={() => slot.available && handlePress(slot)}
            disabled={!slot.available}
            style={[
              styles.pill,
              selected && styles.pillSelected,
              !slot.available && styles.pillUnavailable,
            ]}
          >
            <Text
              style={[
                styles.pillText,
                selected && styles.pillTextSelected,
                !slot.available && styles.pillTextUnavailable,
              ]}
            >
              {slot.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
