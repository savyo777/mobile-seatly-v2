import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { colors, spacing, borderRadius } from '@/lib/theme';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function generateDates(): { date: Date; label: string; dayName: string; isToday: boolean }[] {
  const dates = [];
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    dates.push({
      date: d,
      label: d.getDate().toString(),
      dayName: DAYS[d.getDay()],
      isToday: i === 0,
    });
  }
  return dates;
}

export default function Step1Date() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<number>(0);

  const restaurant = mockRestaurants.find((r) => r.id === restaurantId);
  const dates = useMemo(() => generateDates(), []);
  const progress = 1 / 7;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.stepLabel}>{t('booking.title')}</Text>
          <Text style={styles.restaurantName}>{restaurant?.name}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <Text style={styles.title}>{t('booking.step1Title')}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll} contentContainerStyle={styles.dateScrollContent}>
        {dates.map((d, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => setSelectedDate(idx)}
            style={[styles.dateCard, selectedDate === idx && styles.dateCardSelected]}
          >
            <Text style={[styles.dayText, selectedDate === idx && styles.dayTextSelected]}>
              {d.isToday ? 'Today' : d.dayName}
            </Text>
            <Text style={[styles.dateText, selectedDate === idx && styles.dateTextSelected]}>
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.selectedInfo}>
        <Ionicons name="calendar" size={20} color={colors.gold} />
        <Text style={styles.selectedText}>
          {dates[selectedDate].date.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button title={t('common.next')} onPress={() => router.push(`/booking/${restaurantId}/step2-time?date=${dates[selectedDate].date.toISOString()}`)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  stepLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 },
  restaurantName: { fontSize: 16, color: colors.textPrimary, fontWeight: '600', marginTop: 2 },
  progressBar: { height: 3, backgroundColor: colors.border, marginHorizontal: 20 },
  progressFill: { height: 3, backgroundColor: colors.gold, borderRadius: 2 },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, paddingHorizontal: 20, marginTop: 32, marginBottom: 24 },
  dateScroll: { maxHeight: 90, marginBottom: 32 },
  dateScrollContent: { paddingHorizontal: 20, gap: 10 },
  dateCard: { width: 64, height: 80, borderRadius: borderRadius.md, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dateCardSelected: { backgroundColor: colors.gold, borderColor: colors.gold },
  dayText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500', marginBottom: 4 },
  dayTextSelected: { color: colors.bgBase },
  dateText: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  dateTextSelected: { color: colors.bgBase },
  selectedInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.bgSurface, marginHorizontal: 20, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border },
  selectedText: { fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, backgroundColor: colors.bgBase, borderTopWidth: 1, borderTopColor: colors.border },
});
