import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { colors, spacing, borderRadius } from '@/lib/theme';

const TIME_SLOTS = [
  '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM',
  '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM',
  '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
  '9:00 PM', '9:30 PM',
];

const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8];

export default function Step2Time() {
  const { restaurantId, date } = useLocalSearchParams<{ restaurantId: string; date: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [partySize, setPartySize] = useState(2);
  const progress = 2 / 7;

  const availableSlots = useMemo(() => {
    return TIME_SLOTS.filter((_, i) => i % 3 !== 1 || partySize <= 4);
  }, [partySize]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.stepLabel}>Step 2 of 7</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('booking.step2Title')}</Text>

        <Text style={styles.sectionTitle}>{t('booking.partySize')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.partySizeScroll}>
          <View style={styles.partySizeRow}>
            {PARTY_SIZES.map((size) => (
              <TouchableOpacity
                key={size}
                onPress={() => setPartySize(size)}
                style={[styles.partySizeBtn, partySize === size && styles.partySizeBtnSelected]}
              >
                <Text style={[styles.partySizeText, partySize === size && styles.partySizeTextSelected]}>
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.sectionTitle}>Available Times</Text>
        <View style={styles.timeGrid}>
          {availableSlots.map((time) => (
            <TouchableOpacity
              key={time}
              onPress={() => setSelectedTime(time)}
              style={[styles.timeSlot, selectedTime === time && styles.timeSlotSelected]}
            >
              <Text style={[styles.timeText, selectedTime === time && styles.timeTextSelected]}>
                {time}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          title={t('common.next')}
          onPress={() => router.push(`/booking/${restaurantId}/step3-table?date=${date}&time=${selectedTime}&partySize=${partySize}`)}
          disabled={!selectedTime}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  progressBar: { height: 3, backgroundColor: colors.border, marginHorizontal: 20 },
  progressFill: { height: 3, backgroundColor: colors.gold, borderRadius: 2 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginTop: 24, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 12, marginTop: 8 },
  partySizeScroll: { marginBottom: 24 },
  partySizeRow: { flexDirection: 'row', gap: 10 },
  partySizeBtn: { width: 48, height: 48, borderRadius: borderRadius.md, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  partySizeBtnSelected: { backgroundColor: colors.gold, borderColor: colors.gold },
  partySizeText: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  partySizeTextSelected: { color: colors.bgBase },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeSlot: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: borderRadius.md, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border },
  timeSlotSelected: { backgroundColor: 'rgba(201, 168, 76, 0.15)', borderColor: colors.gold },
  timeText: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
  timeTextSelected: { color: colors.gold },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, backgroundColor: colors.bgBase, borderTopWidth: 1, borderTopColor: colors.border },
});
