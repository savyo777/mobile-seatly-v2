import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useColors,
  createStyles,
  spacing,
  borderRadius,
  typography,
} from '@/lib/theme';
import { getSupabase } from '@/lib/supabase/client';
import {
  fetchRestaurantMenu,
  type MenuCategory,
  type MenuItem,
} from '@/lib/menu/getRestaurantMenu';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { DEFAULT_CURRENCY } from '@/lib/booking/bookingDefaults';

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  title: {
    flex: 1,
    ...typography.h3,
    color: c.textPrimary,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textMuted,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  loadingWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: c.textMuted,
    textAlign: 'center',
  },
  categoryBlock: {
    marginTop: spacing.lg,
  },
  categoryHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.3,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  hScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    width: 220,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  cardPhoto: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: c.bgElevated,
  },
  cardPhotoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: spacing.md,
    gap: 6,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: '500',
    lineHeight: 16,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: c.gold,
    marginTop: 2,
  },
  cardUnavailable: {
    fontSize: 11,
    fontWeight: '600',
    color: c.danger,
    marginTop: 2,
  },
}));

type RestaurantSummary = {
  id: string;
  name: string;
  currency: string;
};

export default function RestaurantMenuScreen() {
  const styles = useStyles();
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, preview } = useLocalSearchParams<{ id: string; preview?: string }>();
  const restaurantId = Array.isArray(id) ? id[0] : id;
  const isPreview = preview === '1';

  const [restaurant, setRestaurant] = useState<RestaurantSummary | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);

    const loadRestaurant = async () => {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data } = await supabase
        .from('restaurants')
        .select('id, name, currency')
        .eq('id', restaurantId)
        .maybeSingle();
      if (!active || !data) return;
      setRestaurant({
        id: String(data.id),
        name: String(data.name ?? 'Menu'),
        currency: String((data as { currency?: string | null }).currency ?? DEFAULT_CURRENCY),
      });
    };

    void Promise.all([
      loadRestaurant(),
      fetchRestaurantMenu(restaurantId)
        .then(({ categories: cats, items: rows }) => {
          if (!active) return;
          setCategories(cats);
          setItems(rows);
        })
        .catch(() => {
          if (!active) return;
          setCategories([]);
          setItems([]);
        }),
    ]).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [restaurantId]);

  const grouped = useMemo(() => {
    const categoryNameById = new Map(categories.map((cat) => [cat.id, cat.name]));
    const buckets = new Map<string, MenuItem[]>();
    for (const item of items) {
      if (!item.is_active) continue;
      const key =
        (item.category_id ? categoryNameById.get(item.category_id) : null) ||
        item.category ||
        'Other';
      const arr = buckets.get(key) ?? [];
      arr.push(item);
      buckets.set(key, arr);
    }
    return Array.from(buckets.entries()).map(([category, list]) => ({
      category,
      items: list.sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          a.name.localeCompare(b.name),
      ),
    }));
  }, [categories, items]);

  const currency = restaurant?.currency ?? DEFAULT_CURRENCY;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {restaurant?.name ?? 'Menu'}
        </Text>
      </View>
      {isPreview ? <Text style={styles.subtitle}>Previewing as a guest</Text> : null}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={c.gold} />
          <Text style={styles.cardDesc}>Loading menu…</Text>
        </View>
      ) : grouped.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>This restaurant has not published a menu yet.</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        >
          {grouped.map(({ category, items: rowItems }) => (
            <View key={category} style={styles.categoryBlock}>
              <Text style={styles.categoryHeading}>{category}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hScrollContent}
                snapToInterval={220 + spacing.md}
                decelerationRate="fast"
              >
                {rowItems.map((item) => {
                  const imageUrl = item.photo_url?.trim();
                  return (
                    <View key={item.id} style={styles.card}>
                      {imageUrl ? (
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.cardPhoto}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.cardPhoto, styles.cardPhotoPlaceholder]}>
                          <Ionicons name="restaurant-outline" size={28} color={c.textMuted} />
                        </View>
                      )}
                      <View style={styles.cardBody}>
                        <Text style={styles.cardName} numberOfLines={2}>
                          {item.name}
                        </Text>
                        {item.description ? (
                          <Text style={styles.cardDesc} numberOfLines={2}>
                            {item.description}
                          </Text>
                        ) : null}
                        <Text style={styles.cardPrice}>
                          {formatCurrency(item.price, currency)}
                        </Text>
                        {!item.is_available ? (
                          <Text style={styles.cardUnavailable}>Currently unavailable</Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
