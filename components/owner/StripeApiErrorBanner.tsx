/**
 * Owner-dashboard inline fallback for Stripe / Supabase outages.
 *
 * Per CLAUDE_SKILLS.md (Stripe parity §17) (Mobile parity §17.4): when
 * a billing API call fails (network, 5xx, timeout) the owner sees
 * this inline retry banner instead of bouncing to a generic error
 * screen. Web's pattern is "Could not reach Stripe. [Retry]" — mobile
 * mirrors with the same affordance.
 *
 * Designed to be rendered inside a screen (not at the layout root) so
 * the rest of the dashboard still works when a single section fails.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

interface Props {
  /** Falsy = no banner. */
  message: string | null;
  /** Called when the user taps Retry. Required. */
  onRetry: () => void;
  /** Hint to the user about WHAT failed (e.g. "income tracking", "card list"). */
  scopeLabel?: string;
}

const useStyles = createStyles((c) => ({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 159, 67, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 159, 67, 0.4)',
    marginBottom: spacing.md,
  },
  icon: {
    marginTop: 1,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...typography.body,
    fontWeight: '600' as const,
    color: c.textPrimary,
  },
  message: {
    ...typography.bodySmall,
    color: c.textSecondary,
  },
  retry: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: c.gold,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  retryLabel: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '600',
  },
}));

export function StripeApiErrorBanner({ message, onRetry, scopeLabel }: Props) {
  const c = useColors();
  const styles = useStyles();
  if (!message) return null;
  const title = scopeLabel
    ? `Couldn’t reach Stripe for ${scopeLabel}`
    : 'Couldn’t reach Stripe';
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Ionicons name="warning-outline" size={18} color="#ff9f43" style={styles.icon} />
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity
          onPress={onRetry}
          style={styles.retry}
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <Text style={styles.retryLabel}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
