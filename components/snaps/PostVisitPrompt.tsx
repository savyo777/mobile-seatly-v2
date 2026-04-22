import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { mockReservations, type Reservation } from '@/lib/mock/reservations';
import { borderRadius, createStyles, shadows, spacing, typography, useColors } from '@/lib/theme';

const GUEST_ID = 'g1';
const WINDOW_MS = 8 * 60 * 60 * 1000; // 8 hours

function getPostVisitReservation(): Reservation | null {
  const now = Date.now();
  return (
    mockReservations.find((r) => {
      if (r.guestId !== GUEST_ID) return false;
      if (r.status === 'cancelled' || r.status === 'no_show') return false;
      // Currently seated → prompt to snap while they're there
      if (r.status === 'seated') return true;
      // Completed or confirmed with a past reservation time within the window
      const t = new Date(r.reservedAt).getTime();
      const elapsed = now - t;
      return elapsed > 0 && elapsed < WINDOW_MS;
    }) ?? null
  );
}

const useStyles = createStyles((c) => ({
  card: {
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.3)',
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  heading: {
    ...typography.body,
    fontWeight: '700',
    color: c.textPrimary,
  },
  sub: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 17,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: c.gold,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm + 2,
  },
  btnPressed: {
    opacity: 0.82,
  },
  btnLabel: {
    ...typography.body,
    fontWeight: '700',
    color: c.bgBase,
  },
}));

export function PostVisitPrompt() {
  const router = useRouter();
  const c = useColors();
  const styles = useStyles();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const reservation = getPostVisitReservation();
  if (!reservation) return null;

  const isSeated = reservation.status === 'seated';
  const heading = isSeated
    ? `Enjoying ${reservation.restaurantName}?`
    : `How was ${reservation.restaurantName}?`;
  const subtext = isSeated
    ? 'Snap your meal and share it — earn 25 points.'
    : 'Share a snap from your visit and earn 25 points.';

  const handleSnap = () => {
    router.push(
      `/(customer)/discover/post-review/camera?restaurantId=${reservation.restaurantId}` as any,
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name="camera" size={20} color={c.gold} />
        </View>
        <View style={styles.text}>
          <Text style={styles.heading}>{heading}</Text>
          <Text style={styles.sub}>{subtext}</Text>
        </View>
        <Pressable
          onPress={() => setDismissed(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Ionicons name="close" size={18} color={c.textMuted} />
        </Pressable>
      </View>

      <Pressable
        onPress={handleSnap}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        accessibilityRole="button"
      >
        <Ionicons name="camera-outline" size={16} color={c.bgBase} />
        <Text style={styles.btnLabel}>Share a Snap</Text>
      </Pressable>
    </View>
  );
}
