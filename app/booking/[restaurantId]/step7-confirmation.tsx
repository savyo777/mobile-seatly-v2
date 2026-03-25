import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '@/components/ui';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { colors, borderRadius, shadows } from '@/lib/theme';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SEAT-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function Step7Confirmation() {
  const { restaurantId, date, time, partySize } = useLocalSearchParams<{ restaurantId: string; date: string; time: string; partySize: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const restaurant = mockRestaurants.find((r) => r.id === restaurantId);
  const parsedDate = date ? new Date(date) : new Date();
  const confirmationCode = useRef(generateCode()).current;

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, fadeAnim]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '100%' }]} />
      </View>

      <View style={styles.content}>
        <Animated.View style={[styles.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
          <Ionicons name="checkmark" size={48} color={colors.bgBase} />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', width: '100%' }}>
          <Text style={styles.title}>{t('booking.bookingConfirmed')}</Text>
          <Text style={styles.subtitle}>{restaurant?.name}</Text>

          <Card style={styles.confirmCard}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.gold} />
              <Text style={styles.detailText}>
                {parsedDate.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={18} color={colors.gold} />
              <Text style={styles.detailText}>{time}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={18} color={colors.gold} />
              <Text style={styles.detailText}>{partySize} {t('booking.guests')}</Text>
            </View>
          </Card>

          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>{t('booking.confirmationCode')}</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{confirmationCode}</Text>
            </View>
          </View>

          <View style={styles.buttons}>
            <Button title={t('booking.addToCalendar')} variant="outlined" onPress={() => {}} />
            <View style={{ height: 12 }} />
            <Button title={t('booking.viewBooking')} onPress={() => router.replace('/(customer)/bookings')} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  progressBar: { height: 3, backgroundColor: colors.border, marginHorizontal: 20, marginTop: 12 },
  progressFill: { height: 3, backgroundColor: colors.gold, borderRadius: 2 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 40 },
  checkCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginBottom: 24, ...shadows.goldGlow },
  title: { fontSize: 26, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 4, marginBottom: 28 },
  confirmCard: { width: '100%', padding: 20, gap: 14, marginBottom: 28 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailText: { fontSize: 15, color: colors.textPrimary },
  codeContainer: { alignItems: 'center', marginBottom: 32 },
  codeLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  codeBox: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: borderRadius.md, backgroundColor: colors.bgSurface, borderWidth: 1.5, borderColor: colors.gold },
  codeText: { fontSize: 22, fontWeight: '700', color: colors.gold, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 2 },
  buttons: { width: '100%' },
});
