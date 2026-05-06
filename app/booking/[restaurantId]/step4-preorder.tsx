import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, FlatList, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button, Badge } from '@/components/ui';
import { mockMenuItems, menuCategories } from '@/lib/mock/menuItems';
import {
  usePublicMenuCategories,
  usePublicMenuItems,
  type MenuItem as LiveMenuItem,
} from '@/lib/cenaiva/api/dataHooks';
import {
  cartSubtotal,
  makeBookingCartParam,
  type PublicBookingCartItem,
} from '@/lib/booking/publicBookingApi';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { useColors, createStyles, borderRadius } from '@/lib/theme';

interface CartItem {
  menuItemId: string;
  menuItemDbId: string | null;
  name: string;
  price: number;
  quantity: number;
}

type DisplayMenuItem = {
  id: string;
  dbId: string | null;
  name: string;
  description: string;
  price: number;
  category: string;
  photoUrl: string | null;
  dietaryFlags: string[];
};

const useStyles = createStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bgBase },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: 13, color: c.textMuted, fontWeight: '500' },
  cartIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 40 },
  cartCount: { fontSize: 13, color: c.gold, fontWeight: '700' },
  progressBar: { height: 3, backgroundColor: c.border, marginHorizontal: 20 },
  progressFill: { height: 3, backgroundColor: c.gold, borderRadius: 2 },
  title: { fontSize: 24, fontWeight: '700', color: c.textPrimary, paddingHorizontal: 20, marginTop: 24 },
  subtitle: { fontSize: 14, color: c.textSecondary, paddingHorizontal: 20, marginTop: 4, marginBottom: 16 },
  categoryScroll: { maxHeight: 40, marginBottom: 16 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: c.bgSurface, borderWidth: 1, borderColor: c.border },
  categoryChipActive: { backgroundColor: 'rgba(201, 168, 76, 0.15)', borderColor: c.gold },
  categoryText: { fontSize: 13, color: c.textSecondary, fontWeight: '500' },
  categoryTextActive: { color: c.gold },
  menuList: { paddingHorizontal: 20, paddingBottom: 180 },
  menuItem: { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border },
  menuPhoto: { width: 72, height: 72, borderRadius: borderRadius.sm },
  menuInfo: { flex: 1, marginLeft: 12 },
  menuName: { fontSize: 15, fontWeight: '600', color: c.textPrimary },
  menuDesc: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  menuMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  menuPrice: { fontSize: 14, fontWeight: '600', color: c.gold },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 32, height: 32, borderRadius: 999, borderWidth: 1, borderColor: c.gold, alignItems: 'center', justifyContent: 'center' },
  qtyBtnAdd: { backgroundColor: c.gold, borderColor: c.gold },
  qtyText: { fontSize: 16, fontWeight: '700', color: c.textPrimary, minWidth: 20, textAlign: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: c.bgBase, borderTopWidth: 1, borderTopColor: c.border },
  cartSummary: { fontSize: 14, color: c.gold, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  footerButtons: { flexDirection: 'row', gap: 12 },
}));

export default function Step4Preorder() {
  const {
    restaurantId,
    date,
    time,
    partySize,
    tableId,
    occasion,
    notes,
    afterBooking,
    shiftId,
    slotDateTime,
    name,
    email,
    phone,
    seatingPreference,
  } = useLocalSearchParams<{
    restaurantId: string;
    date: string;
    time: string;
    partySize: string;
    tableId?: string;
    occasion?: string;
    notes?: string;
    afterBooking?: string;
    shiftId?: string;
    slotDateTime?: string;
    name?: string;
    email?: string;
    phone?: string;
    seatingPreference?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { categories: liveCategories } = usePublicMenuCategories(restaurantId);
  const { items: liveMenuItems, loading: liveMenuLoading } = usePublicMenuItems(restaurantId);
  const BOOKING_STEPS = 6;
  const STEP = 3;
  const progress = STEP / BOOKING_STEPS;

  const liveCategoryNameById = useMemo(
    () => new Map(liveCategories.map((category) => [category.id, category.name])),
    [liveCategories],
  );

  const items = useMemo(() => {
    const liveItems: DisplayMenuItem[] = liveMenuItems
      .filter((item) => item.is_available !== false)
      .map((item: LiveMenuItem) => ({
        id: item.id,
        dbId: item.id,
        name: item.name,
        description: item.description ?? '',
        price: item.price,
        category: item.category_id
          ? liveCategoryNameById.get(item.category_id) ?? item.category ?? 'Menu'
          : item.category ?? 'Menu',
        photoUrl: item.photo_url,
        dietaryFlags: [],
      }));
    const fallbackItems: DisplayMenuItem[] = mockMenuItems
      .filter((m) => m.restaurantId === restaurantId && m.isAvailable)
      .map((item) => ({
        id: item.id,
        dbId: item.id.startsWith('m') ? null : item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        photoUrl: item.photoUrl || null,
        dietaryFlags: item.dietaryFlags,
      }));
    const restaurantItems = liveItems.length || liveMenuLoading ? liveItems : fallbackItems;
    if (selectedCategory === 'All') return restaurantItems;
    return restaurantItems.filter((m) => m.category === selectedCategory);
  }, [liveCategoryNameById, liveMenuItems, liveMenuLoading, restaurantId, selectedCategory]);

  const categories = useMemo(() => {
    const liveCats = liveMenuItems
      .filter((item) => item.is_available !== false)
      .map((item) => item.category_id ? liveCategoryNameById.get(item.category_id) ?? item.category ?? 'Menu' : item.category ?? 'Menu');
    const fallbackCats = mockMenuItems
      .filter((m) => m.restaurantId === restaurantId && m.isAvailable)
      .map((m) => m.category);
    const cats = [...new Set((liveCats.length || liveMenuLoading ? liveCats : fallbackCats).filter(Boolean))];
    return ['All', ...cats];
  }, [liveCategoryNameById, liveMenuItems, liveMenuLoading, restaurantId]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartPayload = useMemo<PublicBookingCartItem[]>(
    () => cart.map((item) => ({
      menu_item_id: item.menuItemDbId,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
    })),
    [cart],
  );
  const encodedCart = makeBookingCartParam(cartPayload);

  const addToCart = (item: DisplayMenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menuItemId: item.id, menuItemDbId: item.dbId, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === menuItemId);
      if (existing && existing.quantity > 1) {
        return prev.map((c) => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity - 1 } : c);
      }
      return prev.filter((c) => c.menuItemId !== menuItemId);
    });
  };

  const getQuantity = (menuItemId: string) => cart.find((c) => c.menuItemId === menuItemId)?.quantity || 0;

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
    `occasion=${encodeURIComponent(occasion ?? '')}`,
    `seatingPreference=${encodeURIComponent(seatingPreference ?? '')}`,
    `notes=${encodeURIComponent(notes ?? '')}`,
  ].join('&');

  const postBooking = afterBooking === '1' || afterBooking === 'true';
  const prepayUrl = `/booking/${restaurantId}/step-prepay-offer?${qpBase}&cartTotal=${cartTotal}&cartCount=${cart.length}`;
  const reviewUrl = `/booking/${restaurantId}/step5-review?${qpBase}&cartTotal=${cartSubtotal(cartPayload)}&cartCount=${cart.length}&cart=${encodedCart}`;
  const confirmUrl = `/booking/${restaurantId}/step7-confirmation?${qpBase}&cart=`;

  const handleSkip = () => {
    if (postBooking) {
      router.dismissAll();
      router.navigate('/(customer)/activity');
    } else {
      router.push(confirmUrl);
    }
  };

  const handleNext = () => {
    if (postBooking) {
      if (cart.length === 0) {
        Alert.alert(
          'No items selected',
          'Please select something from the menu to pre-pay for your meal.',
        );
        return;
      }
      router.push(prepayUrl);
    } else {
      router.push(cart.length > 0 ? reviewUrl : confirmUrl);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.stepLabel}>
          {t('booking.stepCounter', { current: STEP, total: BOOKING_STEPS })}
        </Text>
        <View style={styles.cartIndicator}>
          {cart.length > 0 && (
            <>
              <Ionicons name="cart" size={20} color={c.gold} />
              <Text style={styles.cartCount}>{cart.reduce((s, c) => s + c.quantity, 0)}</Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <Text style={styles.title}>{t('booking.step4Title')}</Text>
      <Text style={styles.subtitle}>{t('booking.preorderOptional')}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
          >
            <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.menuList}
        renderItem={({ item }) => {
          const qty = getQuantity(item.id);
          return (
            <View style={styles.menuItem}>
              {item.photoUrl ? (
                <Image source={{ uri: item.photoUrl }} style={styles.menuPhoto} />
              ) : (
                <View style={[styles.menuPhoto, { alignItems: 'center', justifyContent: 'center', backgroundColor: c.bgSurface }]}>
                  <Ionicons name="restaurant-outline" size={22} color={c.textMuted} />
                </View>
              )}
              <View style={styles.menuInfo}>
                <Text style={styles.menuName}>{item.name}</Text>
                <Text style={styles.menuDesc} numberOfLines={2}>{item.description}</Text>
                <View style={styles.menuMeta}>
                  <Text style={styles.menuPrice}>{formatCurrency(item.price)}</Text>
                  {item.dietaryFlags.length > 0 && (
                    <Badge label={item.dietaryFlags[0]} variant="muted" size="sm" />
                  )}
                </View>
              </View>
              <View style={styles.qtyControls}>
                {qty > 0 && (
                  <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.qtyBtn}>
                    <Ionicons name="remove" size={18} color={c.gold} />
                  </TouchableOpacity>
                )}
                {qty > 0 && <Text style={styles.qtyText}>{qty}</Text>}
                <TouchableOpacity onPress={() => addToCart(item)} style={[styles.qtyBtn, styles.qtyBtnAdd]}>
                  <Ionicons name="add" size={18} color={c.bgBase} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {cart.length > 0 && (
          <Text style={styles.cartSummary}>
            {cart.reduce((s, c) => s + c.quantity, 0)} items · {formatCurrency(cartTotal)}
          </Text>
        )}
        <View style={styles.footerButtons}>
          <Button title={t('booking.skipPreorder')} variant="ghost" onPress={handleSkip} fullWidth={false} style={{ flex: 1 }} />
          <Button title={cart.length > 0 && postBooking ? t('booking.continueToPrepay') : t('common.next')} onPress={handleNext} fullWidth={false} style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  );
}
