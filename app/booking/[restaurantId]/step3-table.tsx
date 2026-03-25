import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { mockTables } from '@/lib/mock/tables';
import { colors, borderRadius } from '@/lib/theme';

export default function Step3Table() {
  const { restaurantId, date, time, partySize } = useLocalSearchParams<{ restaurantId: string; date: string; time: string; partySize: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const progress = 3 / 7;
  const party = parseInt(partySize || '2', 10);

  const availableTables = mockTables.filter(
    (tb) => tb.restaurantId === restaurantId && tb.status === 'empty' && tb.capacity >= party,
  );

  const nextUrl = `/booking/${restaurantId}/step4-preorder?date=${date}&time=${time}&partySize=${partySize}&tableId=${selectedTable || 'auto'}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.stepLabel}>Step 3 of 7</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('booking.step3Title')}</Text>
        <Text style={styles.subtitle}>
          {availableTables.length} tables available for {party} {t('booking.guests')}
        </Text>

        <View style={styles.tableGrid}>
          {availableTables.map((table) => (
            <TouchableOpacity
              key={table.id}
              onPress={() => setSelectedTable(table.id)}
              style={[
                styles.tableCard,
                selectedTable === table.id && styles.tableCardSelected,
                table.shape === 'circle' && styles.tableCardCircle,
              ]}
            >
              <Text style={[styles.tableNumber, selectedTable === table.id && styles.tableNumberSelected]}>
                {table.tableNumber}
              </Text>
              <Text style={[styles.tableLabel, selectedTable === table.id && styles.tableLabelSelected]}>
                {table.label}
              </Text>
              <View style={styles.tableInfo}>
                <Ionicons name="people-outline" size={14} color={selectedTable === table.id ? colors.bgBase : colors.textMuted} />
                <Text style={[styles.tableCapacity, selectedTable === table.id && styles.tableLabelSelected]}>
                  {table.capacity}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => { setSelectedTable(null); router.push(nextUrl.replace(selectedTable || 'auto', 'auto')); }}
          style={styles.skipButton}
        >
          <Ionicons name="shuffle-outline" size={18} color={colors.gold} />
          <Text style={styles.skipText}>{t('booking.skipTableSelection')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button title={t('common.next')} onPress={() => router.push(nextUrl)} />
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
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginTop: 24 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, marginBottom: 24 },
  tableGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tableCard: { width: '47%', aspectRatio: 1.2, borderRadius: borderRadius.lg, backgroundColor: colors.bgSurface, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', padding: 12 },
  tableCardSelected: { backgroundColor: colors.gold, borderColor: colors.gold },
  tableCardCircle: { borderRadius: 999 },
  tableNumber: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  tableNumberSelected: { color: colors.bgBase },
  tableLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  tableLabelSelected: { color: colors.bgBase },
  tableInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  tableCapacity: { fontSize: 13, color: colors.textMuted },
  skipButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, paddingVertical: 14, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  skipText: { fontSize: 14, color: colors.gold, fontWeight: '500' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, backgroundColor: colors.bgBase, borderTopWidth: 1, borderTopColor: colors.border },
});
