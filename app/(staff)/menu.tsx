import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  Image,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { mockMenuItems, menuCategories, type MenuItem } from '@/lib/mock/menuItems';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';
import { ownerSpace } from '@/lib/theme/ownerTheme';

const OWNER_MENU_RESTAURANT_ID = 'r1';

const PLACEHOLDER_PHOTO =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80';

function filterItems(
  items: MenuItem[],
  query: string,
  category: string | 'all',
): MenuItem[] {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (category !== 'all' && item.category !== category) return false;
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Dark scrim + optional native blur; tap-through to close parent modal */
function MenuBackdrop({ onPress }: { onPress: () => void }) {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {Platform.OS === 'web' ? (
        <View style={[StyleSheet.absoluteFillObject, styles.backdropFallback]} />
      ) : (
        <BlurView intensity={42} tint="dark" style={StyleSheet.absoluteFillObject} />
      )}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onPress} accessibilityRole="button" accessibilityLabel="Close" />
    </View>
  );
}

export default function OwnerMenuScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const gridGap = ownerSpace.xs;
  const cellW = (width - ownerSpace.md * 2 - gridGap) / 2;

  const [items, setItems] = useState<MenuItem[]>(() =>
    mockMenuItems.filter((m) => m.restaurantId === OWNER_MENU_RESTAURANT_ID),
  );
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [addOpen, setAddOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [gridDetail, setGridDetail] = useState<MenuItem | null>(null);

  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('Mains');
  const [formAvailable, setFormAvailable] = useState(true);
  const [formPhotoUri, setFormPhotoUri] = useState<string | null>(null);

  const categoryOptions = useMemo(() => {
    const s = new Set<string>(menuCategories);
    items.forEach((i) => s.add(i.category));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(
    () => filterItems(items, query, category),
    [items, query, category],
  );

  const resetForm = useCallback(() => {
    setFormName('');
    setFormPrice('');
    setFormDesc('');
    setFormCategory('Mains');
    setFormAvailable(true);
    setFormPhotoUri(null);
  }, []);

  const pickPhoto = useCallback(async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) {
      Alert.alert(t('common.error'), 'Photo library permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setFormPhotoUri(result.assets[0].uri);
    }
  }, [t]);

  const saveNewItem = useCallback(() => {
    const price = parseFloat(formPrice.replace(',', '.'));
    if (!formName.trim() || Number.isNaN(price) || price < 0) {
      Alert.alert(t('common.error'), 'Enter a valid name and price.');
      return;
    }
    const next: MenuItem = {
      id: `local-${Date.now()}`,
      restaurantId: OWNER_MENU_RESTAURANT_ID,
      name: formName.trim(),
      description: formDesc.trim() || '—',
      price,
      category: formCategory.trim() || 'Mains',
      photoUrl: formPhotoUri ?? PLACEHOLDER_PHOTO,
      allergens: [],
      dietaryFlags: [],
      isAvailable: formAvailable,
      isPreorderable: true,
      isFeatured: false,
      preparationTimeMinutes: 15,
    };
    setItems((prev) => [...prev, next]);
    setAddOpen(false);
    resetForm();
  }, [formName, formPrice, formDesc, formCategory, formAvailable, formPhotoUri, resetForm, t]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const onEditPress = () => {
    Alert.alert(t('owner.menuEditItem'), t('owner.menuEditComingSoon'));
  };

  const openAddItemForm = useCallback(() => {
    setActionsMenuOpen(false);
    resetForm();
    setTimeout(() => setAddOpen(true), 220);
  }, [resetForm]);

  return (
    <View style={styles.screen}>
      <OwnerScreen contentContainerStyle={[styles.scrollPad, { paddingBottom: ownerSpace.xl }]}>
        <View style={styles.headRow}>
          <View style={styles.headText}>
            <Text style={styles.title}>{t('owner.menuTitle')}</Text>
            <Text style={styles.sub}>{t('owner.menuSubtitle')}</Text>
          </View>
          <Pressable
            onPress={() => setActionsMenuOpen(true)}
            style={({ pressed }) => [styles.topAddBtn, pressed && styles.topAddBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={t('owner.menuAddButton')}
          >
            <Text style={styles.topAddBtnText}>{t('owner.menuAddButton')}</Text>
          </Pressable>
        </View>

        <View style={styles.toolbar}>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color={ownerColors.textMuted} style={styles.searchIcon} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('owner.menuSearchPlaceholder')}
              placeholderTextColor={ownerColors.textMuted}
              style={styles.searchInput}
            />
          </View>
          <View style={styles.viewToggle}>
            <Pressable
              onPress={() => setViewMode('list')}
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnOn]}
              accessibilityLabel={t('owner.menuViewList')}
            >
              <Ionicons name="list-outline" size={20} color={viewMode === 'list' ? ownerColors.gold : ownerColors.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => {
                setViewMode('grid');
                setExpandedId(null);
              }}
              style={[styles.toggleBtn, viewMode === 'grid' && styles.toggleBtnOn]}
              accessibilityLabel={t('owner.menuViewGrid')}
            >
              <Ionicons name="grid-outline" size={20} color={viewMode === 'grid' ? ownerColors.gold : ownerColors.textMuted} />
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Pressable
            onPress={() => setCategory('all')}
            style={[styles.filterChip, category === 'all' && styles.filterChipOn]}
          >
            <Text style={[styles.filterText, category === 'all' && styles.filterTextOn]}>
              {t('owner.menuAllCategories')}
            </Text>
          </Pressable>
          {categoryOptions.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.filterChip, category === c && styles.filterChipOn]}
            >
              <Text style={[styles.filterText, category === c && styles.filterTextOn]}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {filtered.length === 0 ? (
          <Text style={styles.empty}>{t('common.noResults')}</Text>
        ) : viewMode === 'list' ? (
          <View style={styles.listShell}>
            {filtered.map((item, index) => (
              <View key={item.id}>
                <Pressable
                  onPress={() => toggleExpand(item.id)}
                  style={({ pressed }) => [
                    styles.compactRow,
                    index > 0 && styles.rowDivider,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <View style={styles.rowLeft}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <View style={styles.statusLine}>
                      <Text style={[styles.statusTxt, !item.isAvailable && styles.statusOff]}>
                        {item.isAvailable ? t('owner.menuAvailable') : t('owner.menuUnavailable')}
                      </Text>
                      {item.isFeatured ? (
                        <Text style={styles.featuredTxt}> · {t('owner.menuFeatured')}</Text>
                      ) : null}
                    </View>
                  </View>
                  <Text style={styles.price}>{formatCurrency(item.price, 'cad')}</Text>
                </Pressable>
                {expandedId === item.id ? (
                  <View style={styles.expanded}>
                    <Image source={{ uri: item.photoUrl }} style={styles.expandedImg} />
                    <Text style={styles.expandedDesc}>{item.description}</Text>
                    <Pressable onPress={onEditPress} style={({ pressed }) => [styles.editBtn, pressed && styles.rowPressed]}>
                      <Ionicons name="create-outline" size={18} color={ownerColors.gold} />
                      <Text style={styles.editBtnText}>{t('owner.menuEditItem')}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.gridWrap}>
            {chunk(filtered, 2).map((pair, rowIdx) => (
              <View key={rowIdx} style={[styles.gridRow, { gap: gridGap }]}>
                {pair.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setGridDetail(item)}
                    style={({ pressed }) => [
                      styles.gridCell,
                      { width: cellW },
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <Image source={{ uri: item.photoUrl }} style={styles.gridThumb} />
                    <Text style={styles.gridName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.gridPrice}>{formatCurrency(item.price, 'cad')}</Text>
                    <Text style={styles.gridMeta} numberOfLines={1}>
                      {item.isAvailable ? t('owner.menuAvailable') : t('owner.menuUnavailable')}
                      {item.isFeatured ? ` · ${t('owner.menuFeatured')}` : ''}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: ownerSpace.md }} />
      </OwnerScreen>

      <Modal
        visible={actionsMenuOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setActionsMenuOpen(false)}
      >
        <View style={styles.actionsModalRoot}>
          <MenuBackdrop onPress={() => setActionsMenuOpen(false)} />
          <Animated.View entering={FadeIn.duration(240)} style={styles.actionsCard}>
            <Text style={styles.actionsTitle}>{t('owner.menuActionsSheetTitle')}</Text>
            <Pressable
              style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
              onPress={openAddItemForm}
            >
              <Ionicons name="add-circle-outline" size={22} color={ownerColors.gold} />
              <Text style={styles.actionRowText}>{t('owner.menuAddItem')}</Text>
              <Ionicons name="chevron-forward" size={18} color={ownerColors.textMuted} style={styles.actionChevron} />
            </Pressable>
            <View style={styles.actionDivider} />
            <Pressable
              style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
              onPress={() => {
                setActionsMenuOpen(false);
                setTimeout(() => Alert.alert(t('owner.menuActionAddCategory'), t('owner.menuCategoryComingSoon')), 200);
              }}
            >
              <Ionicons name="folder-outline" size={22} color={ownerColors.gold} />
              <Text style={styles.actionRowText}>{t('owner.menuActionAddCategory')}</Text>
              <Ionicons name="chevron-forward" size={18} color={ownerColors.textMuted} style={styles.actionChevron} />
            </Pressable>
            <View style={styles.actionDivider} />
            <Pressable
              style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
              onPress={() => {
                setActionsMenuOpen(false);
                setTimeout(() => Alert.alert(t('owner.menuActionImportMenu'), t('owner.menuImportComingSoon')), 200);
              }}
            >
              <Ionicons name="download-outline" size={22} color={ownerColors.gold} />
              <Text style={styles.actionRowText}>{t('owner.menuActionImportMenu')}</Text>
              <Ionicons name="chevron-forward" size={18} color={ownerColors.textMuted} style={styles.actionChevron} />
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={addOpen} animationType="slide" transparent onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalRoot}>
          <MenuBackdrop onPress={() => setAddOpen(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKb}
          >
            <Animated.View entering={FadeInDown.duration(300).springify()}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>{t('owner.menuAddItemTitle')}</Text>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  <Text style={styles.fieldLabel}>{t('owner.menuItemName')}</Text>
                  <TextInput
                    value={formName}
                    onChangeText={setFormName}
                    style={styles.input}
                    placeholderTextColor={ownerColors.textMuted}
                  />
                  <Text style={styles.fieldLabel}>{t('owner.menuItemPrice')}</Text>
                  <TextInput
                    value={formPrice}
                    onChangeText={setFormPrice}
                    keyboardType="decimal-pad"
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor={ownerColors.textMuted}
                  />
                  <Text style={styles.fieldLabel}>{t('owner.menuItemCategory')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChips}>
                    {categoryOptions.map((c) => (
                      <Pressable
                        key={c}
                        onPress={() => setFormCategory(c)}
                        style={[styles.catChip, formCategory === c && styles.catChipOn]}
                      >
                        <Text style={[styles.catChipText, formCategory === c && styles.catChipTextOn]}>{c}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Text style={styles.fieldLabel}>{t('owner.menuItemDescription')}</Text>
                  <TextInput
                    value={formDesc}
                    onChangeText={setFormDesc}
                    style={[styles.input, styles.inputMultiline]}
                    multiline
                    placeholderTextColor={ownerColors.textMuted}
                  />
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>{t('owner.menuAvailable')}</Text>
                    <Switch
                      value={formAvailable}
                      onValueChange={setFormAvailable}
                      trackColor={{ false: ownerColors.bgElevated, true: ownerColors.goldSubtle }}
                      thumbColor={formAvailable ? ownerColors.gold : ownerColors.textMuted}
                    />
                  </View>
                  <Pressable onPress={pickPhoto} style={({ pressed }) => [styles.photoBtn, pressed && styles.rowPressed]}>
                    <Ionicons name="image-outline" size={20} color={ownerColors.gold} />
                    <Text style={styles.photoBtnText}>{t('owner.menuItemAddPhoto')}</Text>
                  </Pressable>
                  {formPhotoUri ? (
                    <Image source={{ uri: formPhotoUri }} style={styles.previewImg} />
                  ) : null}
                </ScrollView>
                <View style={styles.modalActions}>
                  <Pressable onPress={() => setAddOpen(false)} style={styles.modalSecondary}>
                    <Text style={styles.modalSecondaryText}>{t('owner.menuCancel')}</Text>
                  </Pressable>
                  <Pressable onPress={saveNewItem} style={styles.modalPrimary}>
                    <Text style={styles.modalPrimaryText}>{t('owner.menuSaveItem')}</Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={gridDetail != null} animationType="fade" transparent onRequestClose={() => setGridDetail(null)}>
        <View style={styles.detailWrap}>
          <MenuBackdrop onPress={() => setGridDetail(null)} />
          <View style={styles.detailCard}>
            {gridDetail ? (
              <>
                <Text style={styles.detailTitle}>{gridDetail.name}</Text>
                <Image source={{ uri: gridDetail.photoUrl }} style={styles.expandedImg} />
                <Text style={styles.expandedDesc}>{gridDetail.description}</Text>
                <Text style={styles.detailPrice}>{formatCurrency(gridDetail.price, 'cad')}</Text>
                <Pressable onPress={onEditPress} style={({ pressed }) => [styles.editBtn, pressed && styles.rowPressed]}>
                  <Ionicons name="create-outline" size={18} color={ownerColors.gold} />
                  <Text style={styles.editBtnText}>{t('owner.menuEditItem')}</Text>
                </Pressable>
                <Pressable onPress={() => setGridDetail(null)} style={styles.modalSecondary}>
                  <Text style={styles.modalSecondaryText}>{t('owner.menuCancel')}</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollPad: {
    paddingTop: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: ownerColors.text,
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: 15,
    color: ownerColors.textMuted,
    marginBottom: ownerSpace.sm,
    fontWeight: '500',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ownerSpace.sm,
    marginBottom: ownerSpace.sm,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ownerColors.bgSurface,
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    paddingHorizontal: ownerSpace.sm,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    minHeight: 40,
    color: ownerColors.text,
    fontSize: 15,
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: ownerRadii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    overflow: 'hidden',
  },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: ownerColors.bgSurface,
  },
  toggleBtnOn: {
    backgroundColor: ownerColors.goldSubtle,
  },
  filterRow: {
    gap: 6,
    marginBottom: ownerSpace.md,
    paddingVertical: 2,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: ownerRadii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgSurface,
  },
  filterChipOn: {
    borderColor: ownerColors.gold,
    backgroundColor: ownerColors.goldSubtle,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: ownerColors.textMuted,
  },
  filterTextOn: {
    color: ownerColors.gold,
  },
  listShell: {
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgSurface,
    overflow: 'hidden',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: ownerSpace.md,
    gap: ownerSpace.sm,
  },
  rowLeft: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: ownerColors.text,
    letterSpacing: -0.2,
  },
  statusLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 3,
  },
  statusTxt: {
    fontSize: 12,
    fontWeight: '600',
    color: ownerColors.textMuted,
  },
  statusOff: {
    opacity: 0.65,
  },
  featuredTxt: {
    fontSize: 12,
    fontWeight: '600',
    color: ownerColors.gold,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: ownerColors.text,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ownerColors.border,
  },
  rowPressed: {
    opacity: 0.9,
    backgroundColor: ownerColors.bgGlass,
  },
  expanded: {
    paddingHorizontal: ownerSpace.md,
    paddingBottom: ownerSpace.md,
    paddingTop: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ownerColors.border,
    backgroundColor: ownerColors.bg,
  },
  expandedImg: {
    width: '100%',
    height: 160,
    borderRadius: ownerRadii.md,
    marginTop: ownerSpace.sm,
    backgroundColor: ownerColors.bgElevated,
  },
  expandedDesc: {
    fontSize: 14,
    color: ownerColors.textSecondary,
    lineHeight: 20,
    marginTop: ownerSpace.sm,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: ownerSpace.md,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: ownerRadii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: ownerColors.gold,
  },
  gridWrap: {
    gap: ownerSpace.xs,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    backgroundColor: ownerColors.bgSurface,
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    padding: ownerSpace.xs,
  },
  gridThumb: {
    width: '100%',
    aspectRatio: 1.2,
    borderRadius: ownerRadii.sm,
    backgroundColor: ownerColors.bgElevated,
    marginBottom: 6,
  },
  gridName: {
    fontSize: 13,
    fontWeight: '600',
    color: ownerColors.text,
    minHeight: 34,
  },
  gridPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: ownerColors.text,
    marginTop: 2,
  },
  gridMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: ownerColors.textMuted,
    marginTop: 4,
  },
  empty: {
    textAlign: 'center',
    color: ownerColors.textMuted,
    padding: ownerSpace.lg,
    fontSize: 15,
  },
  backdropFallback: {
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: ownerSpace.sm,
    marginBottom: 2,
  },
  headText: {
    flex: 1,
    minWidth: 0,
  },
  topAddBtn: {
    marginTop: 2,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.goldMuted,
    backgroundColor: ownerColors.goldSubtle,
  },
  topAddBtnPressed: {
    opacity: 0.88,
  },
  topAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: ownerColors.gold,
    letterSpacing: 0.2,
  },
  actionsModalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ownerSpace.lg,
  },
  actionsCard: {
    width: '100%',
    maxWidth: 340,
    zIndex: 2,
    backgroundColor: ownerColors.bgSurface,
    borderRadius: ownerRadii['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    overflow: 'hidden',
  },
  actionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: ownerColors.textMuted,
    paddingHorizontal: ownerSpace.md,
    paddingTop: ownerSpace.sm,
    paddingBottom: ownerSpace.xs,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ownerSpace.sm,
    paddingVertical: ownerSpace.md,
    paddingHorizontal: ownerSpace.md,
  },
  actionRowText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: ownerColors.text,
  },
  actionChevron: {
    opacity: 0.65,
  },
  actionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: ownerColors.border,
    marginLeft: ownerSpace.md + 22 + ownerSpace.sm,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  modalKb: {
    width: '100%',
  },
  modalCard: {
    backgroundColor: ownerColors.bgSurface,
    borderTopLeftRadius: ownerRadii.xl,
    borderTopRightRadius: ownerRadii.xl,
    padding: ownerSpace.md,
    paddingBottom: ownerSpace.lg,
    maxHeight: '88%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: ownerColors.text,
    marginBottom: ownerSpace.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: ownerColors.textMuted,
    marginBottom: 6,
    marginTop: ownerSpace.sm,
  },
  input: {
    backgroundColor: ownerColors.bgElevated,
    borderRadius: ownerRadii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    paddingHorizontal: ownerSpace.sm,
    paddingVertical: 10,
    color: ownerColors.text,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  catChips: {
    gap: 6,
    flexWrap: 'wrap',
    flexDirection: 'row',
    marginBottom: 4,
  },
  catChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: ownerRadii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgElevated,
  },
  catChipOn: {
    borderColor: ownerColors.gold,
    backgroundColor: ownerColors.goldSubtle,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: ownerColors.textMuted,
  },
  catChipTextOn: {
    color: ownerColors.gold,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: ownerSpace.sm,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: ownerColors.text,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: ownerSpace.md,
    paddingVertical: ownerSpace.sm,
  },
  photoBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: ownerColors.gold,
  },
  previewImg: {
    width: '100%',
    height: 120,
    borderRadius: ownerRadii.md,
    marginTop: ownerSpace.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: ownerSpace.sm,
    marginTop: ownerSpace.md,
    paddingTop: ownerSpace.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ownerColors.border,
  },
  modalSecondary: {
    paddingVertical: 12,
    paddingHorizontal: ownerSpace.md,
  },
  modalSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: ownerColors.textMuted,
  },
  modalPrimary: {
    paddingVertical: 12,
    paddingHorizontal: ownerSpace.lg,
    borderRadius: ownerRadii.md,
    backgroundColor: ownerColors.goldSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.goldMuted,
  },
  modalPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: ownerColors.gold,
  },
  detailWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: ownerSpace.md,
  },
  detailCard: {
    width: '100%',
    maxWidth: 420,
    zIndex: 2,
    backgroundColor: ownerColors.bgSurface,
    borderRadius: ownerRadii.xl,
    padding: ownerSpace.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ownerColors.text,
    marginBottom: ownerSpace.sm,
  },
  detailPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: ownerColors.text,
    marginTop: ownerSpace.sm,
  },
});
