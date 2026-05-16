import React, { useState } from 'react';
import { Modal, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { useColors, createStyles, borderRadius } from '@/lib/theme';
import { useOptionalReservationHoldContext } from '@/lib/booking/ReservationHoldProvider';

const useStyles = createStyles((c) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: c.border,
    padding: 24,
    gap: 14,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(212, 165, 116, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: c.textPrimary,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textSecondary,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: c.danger,
  },
  buttonsRow: {
    gap: 10,
    marginTop: 6,
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textMuted,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
}));

export function HoldExpiredDialog() {
  const hold = useOptionalReservationHoldContext();
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ restaurantId?: string; date?: string }>();
  const restaurantId = (Array.isArray(params.restaurantId) ? params.restaurantId[0] : params.restaurantId) ?? '';
  const date = (Array.isArray(params.date) ? params.date[0] : params.date) ?? '';
  const [busy, setBusy] = useState(false);
  const [slotTakenMessage, setSlotTakenMessage] = useState<string | null>(null);

  const visible = hold?.state.status === 'expired';

  const handleGrabAgain = async () => {
    if (!hold || busy) return;
    setBusy(true);
    setSlotTakenMessage(null);
    try {
      const ok = await hold.grabAgain();
      if (!ok) {
        setSlotTakenMessage(t('booking.slotJustTaken'));
      }
    } finally {
      setBusy(false);
    }
  };

  const handlePickDifferentTime = () => {
    if (!hold) return;
    void hold.cancelHold();
    if (restaurantId) {
      router.replace(`/booking/${restaurantId}/step2-time?date=${encodeURIComponent(date)}`);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handlePickDifferentTime}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="hourglass-outline" size={28} color={c.warning} />
          </View>
          <Text style={styles.title}>{t('booking.holdExpiredTitle')}</Text>
          <Text style={styles.body}>{t('booking.holdExpiredBody')}</Text>
          {slotTakenMessage ? <Text style={styles.errorText}>{slotTakenMessage}</Text> : null}
          <View style={styles.buttonsRow}>
            {busy ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={c.gold} />
                <Text style={styles.secondaryText}>…</Text>
              </View>
            ) : (
              <Button title={t('booking.grabAgain')} onPress={handleGrabAgain} />
            )}
            <Pressable
              onPress={handlePickDifferentTime}
              style={styles.secondaryBtn}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryText}>{t('booking.pickDifferentTime')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
