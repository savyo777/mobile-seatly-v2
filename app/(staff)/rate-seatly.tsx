import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

const REASONS = [
  'Easy to use',
  'Good for bookings',
  'Helpful staff tools',
  'Reliable payments',
  'Great experience',
];

const useStyles = createStyles((c) => ({
  intro: {
    paddingHorizontal: 4,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  introTitle: { ...typography.h2, color: c.textPrimary },
  introText: { ...typography.body, color: c.textMuted, lineHeight: 22 },

  hero: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.22)',
    backgroundColor: 'rgba(201,168,76,0.06)',
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  heroLabel: {
    ...typography.label,
    color: c.gold,
    letterSpacing: 1.2,
  },
  heroTitle: {
    ...typography.h2,
    color: c.textPrimary,
  },
  heroText: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 18,
  },

  card: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.lg,
  },
  starBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  starBtnActive: {
    backgroundColor: 'rgba(201,168,76,0.10)',
    borderColor: 'rgba(201,168,76,0.35)',
  },
  ratingText: {
    ...typography.body,
    color: c.textPrimary,
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1.1,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  reasonsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
  },
  reasonChipActive: {
    borderColor: c.gold,
    backgroundColor: 'rgba(201,168,76,0.10)',
  },
  reasonText: {
    ...typography.bodySmall,
    color: c.textPrimary,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 120,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    padding: spacing.md,
    color: c.textPrimary,
    ...typography.body,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: c.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  submitText: {
    ...typography.body,
    color: c.bgBase,
    fontWeight: '800',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    backgroundColor: 'rgba(201,168,76,0.06)',
    marginBottom: spacing.lg,
  },
  noteText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
}));

export default function RateSeatlyScreen() {
  const c = useColors();
  const styles = useStyles();
  const [rating, setRating] = useState(5);
  const [selectedReasons, setSelectedReasons] = useState<string[]>(['Easy to use', 'Helpful staff tools']);
  const [message, setMessage] = useState('');

  const ratingLabel = useMemo(() => {
    if (rating >= 5) return 'Excellent';
    if (rating >= 4) return 'Good';
    if (rating >= 3) return 'Okay';
    if (rating >= 2) return 'Needs work';
    return 'Poor';
  }, [rating]);

  const toggleReason = (reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((item) => item !== reason) : [...prev, reason],
    );
  };

  const onSubmit = () => {
    Alert.alert(
      'Thanks for the feedback',
      `You rated Seatly ${rating}/5.\n\nReasons: ${selectedReasons.length ? selectedReasons.join(', ') : 'none'}${
        message.trim() ? `\n\nNote: ${message.trim()}` : ''
      }`,
    );
  };

  return (
    <OwnerScreen header={<SubpageHeader title="Rate Seatly" accentBack />}>
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Rate Seatly</Text>
        <Text style={styles.introText}>
          Tell us how the restaurant side feels and what we should improve next.
        </Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>FEEDBACK</Text>
        <Text style={styles.heroTitle}>Your opinion helps us build better tools</Text>
        <Text style={styles.heroText}>
          Pick a rating, choose what stood out, and leave a short note if you want.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((value) => {
            const active = value <= rating;
            return (
              <Pressable
                key={value}
                onPress={() => setRating(value)}
                style={({ pressed }) => [
                  styles.starBtn,
                  active && styles.starBtnActive,
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Rate ${value} stars`}
              >
                <Ionicons
                  name={active ? 'star' : 'star-outline'}
                  size={22}
                  color={active ? c.gold : c.textMuted}
                />
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.ratingText}>
          {rating}/5 - {ratingLabel}
        </Text>
      </View>

      <Text style={styles.sectionLabel}>WHAT STANDS OUT</Text>
      <View style={styles.reasonsWrap}>
        {REASONS.map((reason) => {
          const active = selectedReasons.includes(reason);
          return (
            <Pressable
              key={reason}
              onPress={() => toggleReason(reason)}
              style={[styles.reasonChip, active && styles.reasonChipActive]}
            >
              <Text style={styles.reasonText}>{reason}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>OPTIONAL NOTE</Text>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Tell us what would make Seatly better for your restaurant."
        placeholderTextColor={c.textMuted}
        style={styles.textArea}
        multiline
      />

      <Pressable
        onPress={onSubmit}
        style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.submitText}>Send feedback</Text>
      </Pressable>

      <View style={styles.noteRow}>
        <Ionicons name="heart-outline" size={18} color={c.gold} />
        <Text style={styles.noteText}>
          We read every rating and use it to improve the restaurant side.
        </Text>
      </View>
    </OwnerScreen>
  );
}
