import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, createStyles } from '@/lib/theme';
import { useOptionalReservationHoldContext } from '@/lib/booking/ReservationHoldProvider';

function formatRemaining(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const useStyles = createStyles((c) => ({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  bannerCalm: {
    backgroundColor: 'rgba(201, 162, 74, 0.10)',
    borderBottomColor: c.gold,
  },
  bannerWarning: {
    backgroundColor: 'rgba(212, 165, 116, 0.18)',
    borderBottomColor: c.warning,
  },
  bannerUrgent: {
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderBottomColor: c.danger,
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: c.textPrimary,
  },
}));

export function HoldTimerBanner() {
  const hold = useOptionalReservationHoldContext();
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const status = hold?.state.status ?? 'idle';
  const visualState = hold?.visualState ?? 'calm';
  const isUrgent = visualState === 'urgent' && status === 'active';

  useEffect(() => {
    if (!isUrgent) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.55, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isUrgent, pulseAnim]);

  const containerStyle = useMemo(() => {
    if (visualState === 'urgent') return [styles.banner, styles.bannerUrgent];
    if (visualState === 'warning') return [styles.banner, styles.bannerWarning];
    return [styles.banner, styles.bannerCalm];
  }, [styles, visualState]);

  const accentColor = visualState === 'urgent' ? c.danger : visualState === 'warning' ? c.warning : c.gold;

  if (!hold || status !== 'active') return null;
  if (hold.state.status !== 'active') return null;

  const secondsLeft = hold.state.secondsLeft;
  const label =
    visualState === 'urgent'
      ? t('booking.holdExpiringSoon', { time: formatRemaining(secondsLeft) })
      : t('booking.holdingTable', { time: formatRemaining(secondsLeft) });

  return (
    <Animated.View
      style={[containerStyle, { opacity: pulseAnim, paddingTop: insets.top + 10 }]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <Ionicons name="time-outline" size={18} color={accentColor} />
      <Text style={styles.label}>{label}</Text>
    </Animated.View>
  );
}
