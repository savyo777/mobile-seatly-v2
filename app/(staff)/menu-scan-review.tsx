import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { createStyles } from '@/lib/theme';
import { ownerColorsFromPalette, ownerRadii, ownerSpace, useOwnerColors } from '@/lib/theme/ownerTheme';
import { consumePendingMenuScan, type PendingMenuScan } from '@/lib/menu/pendingMenuScan';
import { scanMenu, type MenuScanItemDraft } from '@/lib/menu/scanMenu';
import { useMenu } from '@/lib/context/MenuContext';
import { friendlyError } from '@/lib/errors/friendlyError';
import { normalizeMoneyInput } from '@/lib/validation/input';
import { getSupabase } from '@/lib/supabase/client';

interface DraftRow extends MenuScanItemDraft {
  id: string;
}

function formatPrice(price: number | null): string {
  if (price === null || !Number.isFinite(price)) return '';
  return price.toFixed(2);
}

export default function MenuScanReviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const ownerColors = useOwnerColors();
  const styles = useStyles();
  const { ownerRestaurantId, addItem, categories } = useMenu();

  const [pending, setPending] = useState<PendingMenuScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Consume the pending scan exactly once when this screen mounts.
  // useFocusEffect would re-fire on every back-nav; we don't want that.
  useEffect(() => {
    const next = consumePendingMenuScan();
    if (!next) {
      // No pending scan (e.g. user deep-linked here directly). Bounce
      // back to the picker.
      router.replace('/(staff)/menu-scan' as never);
      return;
    }
    setPending(next);
  }, [router]);

  useEffect(() => {
    if (!pending) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrorCode(null);
      try {
        const result = await scanMenu({
          imageBase64: pending.base64,
          imageMimeType: pending.mimeType,
        });
        if (cancelled) return;
        if (result.errorCode) {
          setErrorCode(result.errorCode);
          setRows([]);
          setSuggestedCategories([]);
        } else {
          setRows(
            result.draft.items.map((item, idx) => ({
              ...item,
              id: `scan-${idx}-${Date.now()}`,
            })),
          );
          setSuggestedCategories(result.draft.suggested_categories);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pending]);

  // Pressing back without saving = treat as discard, but only confirm
  // if the user has actually started editing OR has items to save.
  const handleDiscard = useCallback(() => {
    if (rows.length === 0 && !errorCode) {
      router.back();
      return;
    }
    Alert.alert(
      t('owner.menuScanDiscardConfirmTitle'),
      t('owner.menuScanDiscardConfirmBody'),
      [
        { text: t('owner.menuScanCancel'), style: 'cancel' },
        {
          text: t('owner.menuScanDiscard'),
          style: 'destructive',
          onPress: () => router.replace('/(staff)/menu' as never),
        },
      ],
    );
  }, [errorCode, rows.length, router, t]);

  const updateRow = useCallback(
    (id: string, patch: Partial<DraftRow>) => {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    },
    [],
  );

  const deleteRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Group rows by category, preserving first-seen order — mirrors how
  // the menu actually reads on the printed page.
  const grouped = useMemo(() => {
    const order: string[] = [];
    const buckets = new Map<string, DraftRow[]>();
    for (const row of rows) {
      const key = row.category && row.category.trim().length > 0
        ? row.category.trim()
        : t('owner.menuScanItemUncategorized');
      if (!buckets.has(key)) {
        order.push(key);
        buckets.set(key, []);
      }
      buckets.get(key)!.push(row);
    }
    return order.map((cat) => ({ category: cat, items: buckets.get(cat)! }));
  }, [rows, t]);

  const handleSaveAll = useCallback(async () => {
    if (saving || rows.length === 0) return;
    setSaving(true);
    try {
      // Normalize prices + names. Skip any row missing required fields.
      const validRows: DraftRow[] = [];
      for (const row of rows) {
        const name = (row.name ?? '').trim();
        if (!name) continue;
        const price = typeof row.price === 'number' && Number.isFinite(row.price) ? row.price : 0;
        validRows.push({
          ...row,
          name,
          description: row.description?.trim() || '',
          price,
          category: row.category?.trim() || 'Menu',
        });
      }

      if (validRows.length === 0) {
        Alert.alert(t('common.error'), friendlyError(undefined, t('owner.menuScanSaveError')));
        setSaving(false);
        return;
      }

      // Batch insert — much faster than one MenuContext.addItem call per
      // row when the menu has 40+ items. We bypass MenuContext for the
      // insert and then call addItem locally to keep the list state in
      // sync without firing N additional inserts.
      const restaurantId = ownerRestaurantId ?? '';
      const supabase = getSupabase();
      if (supabase && restaurantId) {
        const rowsToInsert = validRows.map((r) => ({
          restaurant_id: restaurantId,
          name: r.name,
          description: r.description ?? '',
          price: r.price ?? 0,
          category: r.category ?? 'Menu',
          photo_url: null,
          allergens: r.allergens ?? [],
          dietary_flags: [],
          is_available: true,
          is_preorderable: true,
          is_featured: false,
          preparation_time_minutes: 15,
          calories: 0,
        }));
        const { data, error } = await supabase
          .from('menu_items')
          .insert(rowsToInsert)
          .select('id,name,description,price,category,photo_url,allergens,dietary_flags,is_available,is_preorderable,is_featured,preparation_time_minutes');
        if (error) {
          if (__DEV__) console.warn('[menu-scan] bulk insert failed', error);
          Alert.alert(t('common.error'), friendlyError(error, t('owner.menuScanSaveError')));
          setSaving(false);
          return;
        }
        // Mirror inserted rows into MenuContext local state so the
        // user sees them immediately on the menu screen.
        for (const row of data ?? []) {
          addItem({
            id: String(row.id),
            restaurantId,
            name: String(row.name ?? ''),
            description: String(row.description ?? ''),
            price: typeof row.price === 'number' ? row.price : Number(row.price ?? 0),
            category: String(row.category ?? 'Menu'),
            photoUrl: typeof row.photo_url === 'string' ? row.photo_url : '',
            allergens: Array.isArray(row.allergens) ? (row.allergens as string[]) : [],
            dietaryFlags: Array.isArray(row.dietary_flags) ? (row.dietary_flags as string[]) : [],
            isAvailable: row.is_available !== false,
            isPreorderable: row.is_preorderable !== false,
            isFeatured: row.is_featured === true,
            preparationTimeMinutes: typeof row.preparation_time_minutes === 'number' ? row.preparation_time_minutes : 15,
          });
        }
      } else {
        // No Supabase (demo / offline) — push through MenuContext.
        for (const r of validRows) {
          addItem({
            id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            restaurantId,
            name: r.name,
            description: r.description ?? '',
            price: r.price ?? 0,
            category: r.category ?? 'Menu',
            photoUrl: '',
            allergens: r.allergens ?? [],
            dietaryFlags: [],
            isAvailable: true,
            isPreorderable: true,
            isFeatured: false,
            preparationTimeMinutes: 15,
          });
        }
      }

      Alert.alert(t('common.success'), t('owner.menuScanSaveSuccess', { count: validRows.length }), [
        { text: 'OK', onPress: () => router.replace('/(staff)/menu' as never) },
      ]);
    } catch (err) {
      if (__DEV__) console.warn('[menu-scan] saveAll failed', err);
      Alert.alert(t('common.error'), friendlyError(err, t('owner.menuScanSaveError')));
    } finally {
      setSaving(false);
    }
  }, [addItem, ownerRestaurantId, router, rows, saving, t]);

  const totalCount = rows.length;
  void categories;
  void suggestedCategories;

  return (
    <OwnerScreen
      scrollable={false}
      header={
        <SubpageHeader
          title={t('owner.menuScanReviewTitle')}
          subtitle={!loading && !errorCode ? t('owner.menuScanReviewSubtitle', { count: totalCount }) : undefined}
          fallbackTab="menu"
          onBack={handleDiscard}
        />
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kbAvoid}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <View style={styles.previewWrap}>
              {pending?.uri ? (
                <Image source={{ uri: pending.uri }} style={styles.preview} resizeMode="cover" />
              ) : null}
            </View>
            <ActivityIndicator color={ownerColors.gold} size="large" />
            <Text style={styles.loadingText}>{t('owner.menuScanLoading')}</Text>
          </View>
        ) : errorCode ? (
          <View style={styles.errorWrap}>
            <Ionicons name="alert-circle-outline" size={42} color={ownerColors.gold} />
            <Text style={styles.errorTitle}>{t('owner.menuScanEmptyTitle')}</Text>
            <Text style={styles.errorBody}>{t('owner.menuScanEmptyBody')}</Text>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
              onPress={() => router.replace('/(staff)/menu-scan' as never)}
            >
              <Text style={styles.primaryBtnText}>{t('owner.menuScanEmptyRetry')}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
              <View style={styles.disclaimer}>
                <Ionicons name="information-circle" size={18} color={ownerColors.gold} />
                <Text style={styles.disclaimerText}>{t('owner.menuScanDisclaimer')}</Text>
              </View>

              {grouped.map((section) => (
                <View key={section.category} style={styles.section}>
                  <Text style={styles.sectionTitle}>{section.category}</Text>
                  {section.items.map((item) => (
                    <View key={item.id} style={styles.itemCard}>
                      <View style={styles.itemRowTop}>
                        <TextInput
                          style={styles.itemName}
                          value={item.name}
                          onChangeText={(text) => updateRow(item.id, { name: text })}
                          placeholder={t('owner.menuItemName')}
                          placeholderTextColor={ownerColors.textMuted}
                        />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${item.name}`}
                          hitSlop={10}
                          style={({ pressed }) => [styles.deleteBtn, pressed && styles.btnPressed]}
                          onPress={() => deleteRow(item.id)}
                        >
                          <Ionicons name="close-circle" size={22} color={ownerColors.textMuted} />
                        </Pressable>
                      </View>
                      <View style={styles.itemRowBottom}>
                        <TextInput
                          style={styles.itemDesc}
                          value={item.description ?? ''}
                          onChangeText={(text) => updateRow(item.id, { description: text || null })}
                          placeholder={t('owner.menuItemDescription')}
                          placeholderTextColor={ownerColors.textMuted}
                          multiline
                        />
                        <View style={styles.priceWrap}>
                          <Text style={styles.dollarSign}>$</Text>
                          <TextInput
                            style={styles.priceInput}
                            value={formatPrice(item.price)}
                            onChangeText={(text) => {
                              const normalized = normalizeMoneyInput(text);
                              updateRow(item.id, { price: normalized });
                            }}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor={ownerColors.textMuted}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
                onPress={handleDiscard}
                disabled={saving}
              >
                <Text style={styles.secondaryBtnText}>{t('owner.menuScanDiscard')}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.primaryBtnLarge, (pressed || saving) && styles.btnPressed]}
                onPress={handleSaveAll}
                disabled={saving || rows.length === 0}
              >
                {saving ? (
                  <ActivityIndicator color="#111" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t('owner.menuScanSaveAll')}</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </OwnerScreen>
  );
}

const useStyles = createStyles((c) => {
  const ownerColors = ownerColorsFromPalette(c);
  return {
    kbAvoid: { flex: 1 },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: ownerSpace.md,
      paddingHorizontal: ownerSpace.lg,
    },
    previewWrap: {
      width: 140,
      height: 180,
      borderRadius: ownerRadii.xl,
      backgroundColor: ownerColors.bgElevated,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: ownerColors.border,
      marginBottom: ownerSpace.md,
    },
    preview: { width: '100%', height: '100%' },
    loadingText: {
      color: ownerColors.textSecondary,
      fontSize: 14,
    },
    errorWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: ownerSpace.md,
      paddingHorizontal: ownerSpace.lg,
    },
    errorTitle: {
      color: ownerColors.text,
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
    },
    errorBody: {
      color: ownerColors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    body: {
      paddingHorizontal: ownerSpace.md,
      paddingTop: ownerSpace.sm,
      paddingBottom: ownerSpace.xl,
      gap: ownerSpace.md,
    },
    disclaimer: {
      flexDirection: 'row',
      gap: ownerSpace.sm,
      padding: ownerSpace.md,
      borderRadius: ownerRadii.xl,
      backgroundColor: 'rgba(201,168,76,0.10)',
      borderWidth: 1,
      borderColor: 'rgba(201,168,76,0.35)',
    },
    disclaimerText: {
      color: ownerColors.text,
      fontSize: 13,
      lineHeight: 18,
      flex: 1,
    },
    section: {
      gap: ownerSpace.xs,
    },
    sectionTitle: {
      color: ownerColors.gold,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginTop: ownerSpace.sm,
      marginBottom: ownerSpace.xs,
    },
    itemCard: {
      padding: ownerSpace.md,
      borderRadius: ownerRadii.md,
      backgroundColor: ownerColors.bgElevated,
      borderWidth: 1,
      borderColor: ownerColors.border,
      gap: ownerSpace.xs,
    },
    itemRowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: ownerSpace.sm,
    },
    itemName: {
      flex: 1,
      color: ownerColors.text,
      fontSize: 16,
      fontWeight: '700',
      paddingVertical: 4,
    },
    deleteBtn: { padding: 2 },
    itemRowBottom: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: ownerSpace.sm,
    },
    itemDesc: {
      flex: 1,
      color: ownerColors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      paddingVertical: 4,
    },
    priceWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      borderRadius: ownerRadii.sm,
      backgroundColor: 'rgba(255,255,255,0.06)',
      paddingHorizontal: ownerSpace.sm,
      paddingVertical: 4,
      minWidth: 84,
      justifyContent: 'flex-end',
    },
    dollarSign: {
      color: ownerColors.textSecondary,
      fontSize: 14,
      fontWeight: '700',
    },
    priceInput: {
      color: ownerColors.text,
      fontSize: 14,
      fontWeight: '700',
      minWidth: 50,
      textAlign: 'right',
    },
    footer: {
      flexDirection: 'row',
      gap: ownerSpace.sm,
      paddingHorizontal: ownerSpace.md,
      paddingTop: ownerSpace.sm,
      paddingBottom: ownerSpace.md,
      borderTopWidth: 1,
      borderTopColor: ownerColors.border,
      backgroundColor: ownerColors.bg,
    },
    primaryBtn: {
      paddingHorizontal: 22,
      paddingVertical: 12,
      borderRadius: 999,
      backgroundColor: ownerColors.gold,
      marginTop: ownerSpace.sm,
    },
    primaryBtnLarge: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: ownerRadii.xl,
      backgroundColor: ownerColors.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnText: {
      color: '#0F0F0F',
      fontWeight: '800',
      fontSize: 15,
    },
    secondaryBtn: {
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderRadius: ownerRadii.xl,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: ownerColors.border,
    },
    secondaryBtnText: {
      color: ownerColors.textSecondary,
      fontWeight: '700',
      fontSize: 15,
    },
    btnPressed: { opacity: 0.7 },
  } as const;
});
