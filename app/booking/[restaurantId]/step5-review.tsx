import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '@/components/ui';
import { getCachedRestaurantById, loadRestaurantForBooking } from '@/lib/data/restaurantCatalog';
import { cartSubtotal, parseBookingCartParam } from '@/lib/booking/publicBookingApi';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { useColors, createStyles, borderRadius } from '@/lib/theme';

const OCCASIONS = ['None', 'Birthday', 'Anniversary', 'Date Night', 'Business Dinner', 'Celebration', 'Other'];

const useStyles = createStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bgBase },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: 13, color: c.textMuted, fontWeight: '500' },
  progressBar: { height: 3, backgroundColor: c.border, marginHorizontal: 20 },
  progressFill: { height: 3, backgroundColor: c.gold, borderRadius: 2 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  title: { fontSize: 24, fontWeight: '700', color: c.textPrimary, marginTop: 24, marginBottom: 20 },
  summaryCard: { padding: 20, gap: 14 },
  restaurantName: { fontSize: 18, fontWeight: '700', color: c.textPrimary, marginBottom: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailText: { fontSize: 15, color: c.textPrimary },
  preorderRow: { marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: c.textPrimary, marginTop: 24, marginBottom: 12 },
  occasionScroll: { marginBottom: 8 },
  occasionRow: { flexDirection: 'row', gap: 8 },
  occasionChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: c.bgSurface, borderWidth: 1, borderColor: c.border },
  occasionChipActive: { backgroundColor: 'rgba(201, 168, 76, 0.15)', borderColor: c.gold },
  occasionText: { fontSize: 13, color: c.textSecondary, fontWeight: '500' },
  occasionTextActive: { color: c.gold },
  textArea: { backgroundColor: c.bgSurface, borderWidth: 1, borderColor: c.border, borderRadius: borderRadius.md, padding: 16, color: c.textPrimary, fontSize: 15, minHeight: 100 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, backgroundColor: c.bgBase, borderTopWidth: 1, borderTopColor: c.border },
}));

export default function Step5Review() {
  const {
    restaurantId,
    date,
    time,
    partySize,
    tableId,
    cartCount,
    occasion: initialOccasion,
    notes,
    shiftId,
    slotDateTime,
    name,
    email,
    phone,
    seatingPreference,
    cart: cartParam,
  } = useLocalSearchParams<{
    restaurantId: string;
    date: string;
    time: string;
    partySize: string;
    tableId: string;
    cartTotal: string;
    cartCount: string;
    occasion?: string;
    notes?: string;
    shiftId?: string;
    slotDateTime?: string;
    name?: string;
    email?: string;
    phone?: string;
    seatingPreference?: string;
    cart?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const [specialRequest, setSpecialRequest] = useState(notes ?? '');
  const [occasion, setOccasion] = useState(initialOccasion || 'None');
  const [restaurant, setRestaurant] = useState(() => getCachedRestaurantById(restaurantId));
  const BOOKING_STEPS = 6;
  const STEP = 4;
  const progress = STEP / BOOKING_STEPS;

  useEffect(() => {
    let cancelled = false;
    loadRestaurantForBooking(restaurantId).then((loaded) => {
      if (!cancelled) setRestaurant(loaded ?? getCachedRestaurantById(restaurantId));
    });
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  const cart = parseBookingCartParam(cartParam);
  const parsedDate = date ? new Date(date) : new Date();
  const preorderTotal = cartSubtotal(cart);
  const preorderCount = parseInt(cartCount || '0', 10);
  const qpBase = [
    `date=${encodeURIComponent(date ?? '')}`,
    `time=${encodeURIComponent(time ?? '')}`,
    `partySize=${partySize}`,
    `tableId=${encodeURIComponent(tableId ?? 'auto')}`,
    `shiftId=${encodeURIComponent(shiftId ?? '')}`,
    `slotDateTime=${encodeURIComponent(slotDateTime ?? '')}`,
    `name=${encodeURIComponent(name ?? '')}`,
    `email=${encodeURIComponent(email ?? '')}`,
    `phone=${encodeURIComponent(phone ?? '')}`,
    `occasion=${encodeURIComponent(occasion === 'None' ? '' : occasion)}`,
    `seatingPreference=${encodeURIComponent(seatingPreference ?? '')}`,
    `notes=${encodeURIComponent(specialRequest)}`,
    `cartTotal=${preorderTotal}`,
    `cartCount=${preorderCount}`,
    `cart=${encodeURIComponent(cartParam ?? '')}`,
  ].join('&');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.stepLabel}>
          {t('booking.stepCounter', { current: STEP, total: BOOKING_STEPS })}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('booking.step5Title')}</Text>

        <Card style={styles.summaryCard}>
          <Text style={styles.restaurantName}>{restaurant?.name}</Text>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={18} color={c.gold} />
            <Text style={styles.detailText}>
              {parsedDate.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={18} color={c.gold} />
            <Text style={styles.detailText}>{time}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={18} color={c.gold} />
            <Text style={styles.detailText}>{partySize} {t('booking.guests')}</Text>
          </View>
          {tableId && tableId !== 'auto' && (
            <View style={styles.detailRow}>
              <Ionicons name="grid-outline" size={18} color={c.gold} />
              <Text style={styles.detailText}>Table {tableId.replace('t', 'T')}</Text>
            </View>
          )}
          {preorderCount > 0 && (
            <View style={[styles.detailRow, styles.preorderRow]}>
              <Ionicons name="restaurant-outline" size={18} color={c.gold} />
              <Text style={styles.detailText}>{preorderCount} pre-order items · {formatCurrency(preorderTotal)}</Text>
            </View>
          )}
        </Card>

        <Text style={styles.sectionTitle}>{t('booking.occasion')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.occasionScroll}>
          <View style={styles.occasionRow}>
            {OCCASIONS.map((occ) => (
              <TouchableOpacity
                key={occ}
                onPress={() => setOccasion(occ)}
                style={[styles.occasionChip, occasion === occ && styles.occasionChipActive]}
              >
                <Text style={[styles.occasionText, occasion === occ && styles.occasionTextActive]}>{occ}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.sectionTitle}>{t('booking.specialRequest')}</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Any special requests or dietary needs..."
          placeholderTextColor={c.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={specialRequest}
          onChangeText={setSpecialRequest}
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button title={t('common.next')} onPress={() => router.push(`/booking/${restaurantId}/step6-payment?${qpBase}`)} />
      </View>
    </View>
  );
}
