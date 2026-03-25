import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button, Card, Badge } from '@/components/ui';
import { mockMenuItems, menuCategories } from '@/lib/mock/menuItems';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { colors, borderRadius } from '@/lib/theme';

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export default function Step4Preorder() {
  const { restaurantId, date, time, partySize, tableId } = useLocalSearchParams<{ restaurantId: string; date: string; time: string; partySize: string; tableId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const progress = 4 / 7;

  const items = useMemo(() => {
    const restaurantItems = mockMenuItems.filter((m) => m.restaurantId === restaurantId && m.isPreorderable && m.isAvailable);
    if (selectedCategory === 'All') return restaurantItems;
    return restaurantItems.filter((m) => m.category === selectedCategory);
  }, [restaurantId, selectedCategory]);

  const categories = useMemo(() => {
    const cats = [...new Set(mockMenuItems.filter((m) => m.restaurantId === restaurantId && m.isPreorderable).map((m) => m.category))];
    return ['All', ...cats];
  }, [restaurantId]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = (item: typeof mockMenuItems[0]) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
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

  const nextUrl = `/booking/${restaurantId}/step5-review?date=${date}&time=${time}&partySize=${partySize}&tableId=${tableId}&cartTotal=${cartTotal}&cartCount=${cart.length}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.stepLabel}>Step 4 of 7</Text>
        <View style={styles.cartIndicator}>
          {cart.length > 0 && (
            <>
              <Ionicons name="cart" size={20} color={colors.gold} />
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
              <Image source={{ uri: item.photoUrl }} style={styles.menuPhoto} />
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
                    <Ionicons name="remove" size={18} color={colors.gold} />
                  </TouchableOpacity>
                )}
                {qty > 0 && <Text style={styles.qtyText}>{qty}</Text>}
                <TouchableOpacity onPress={() => addToCart(item)} style={[styles.qtyBtn, styles.qtyBtnAdd]}>
                  <Ionicons name="add" size={18} color={colors.bgBase} />
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
          <Button title={t('booking.skipPreorder')} variant="ghost" onPress={() => router.push(nextUrl)} fullWidth={false} style={{ flex: 1 }} />
          <Button title={t('common.next')} onPress={() => router.push(nextUrl)} fullWidth={false} style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  cartIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 40 },
  cartCount: { fontSize: 13, color: colors.gold, fontWeight: '700' },
  progressBar: { height: 3, backgroundColor: colors.border, marginHorizontal: 20 },
  progressFill: { height: 3, backgroundColor: colors.gold, borderRadius: 2 },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, paddingHorizontal: 20, marginTop: 24 },
  subtitle: { fontSize: 14, color: colors.textSecondary, paddingHorizontal: 20, marginTop: 4, marginBottom: 16 },
  categoryScroll: { maxHeight: 40, marginBottom: 16 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border },
  categoryChipActive: { backgroundColor: 'rgba(201, 168, 76, 0.15)', borderColor: colors.gold },
  categoryText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  categoryTextActive: { color: colors.gold },
  menuList: { paddingHorizontal: 20, paddingBottom: 180 },
  menuItem: { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuPhoto: { width: 72, height: 72, borderRadius: borderRadius.sm },
  menuInfo: { flex: 1, marginLeft: 12 },
  menuName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  menuDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  menuMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  menuPrice: { fontSize: 14, fontWeight: '600', color: colors.gold },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 32, height: 32, borderRadius: 999, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  qtyBtnAdd: { backgroundColor: colors.gold, borderColor: colors.gold },
  qtyText: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, minWidth: 20, textAlign: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.bgBase, borderTopWidth: 1, borderTopColor: colors.border },
  cartSummary: { fontSize: 14, color: colors.gold, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  footerButtons: { flexDirection: 'row', gap: 12 },
});
