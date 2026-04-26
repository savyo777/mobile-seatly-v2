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
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  LinearTransition,
} from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { useMenu } from '@/lib/context/MenuContext';
import { type MenuItem } from '@/lib/mock/menuItems';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { createStyles, useTheme } from '@/lib/theme';
import { ownerColorsFromPalette, ownerRadii, ownerSpace, useOwnerColors } from '@/lib/theme/ownerTheme';

const OWNER_MENU_RESTAURANT_ID = 'r1';

const PLACEHOLDER_PHOTO =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80';

const MODAL_EXIT_MS = 190;

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
  const { effective } = useTheme();
  const styles = useStyles();
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {Platform.OS === 'web' ? (
        <View style={[StyleSheet.absoluteFillObject, styles.backdropFallback]} />
      ) : (
        <BlurView intensity={42} tint={effective === 'light' ? 'light' : 'dark'} style={StyleSheet.absoluteFillObject} />
      )}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onPress} accessibilityRole="button" accessibilityLabel="Close" />
    </View>
  );
}

export default function OwnerMenuScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const ownerColors = useOwnerColors();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const { items, categories } = useMenu();
  const gridGap = ownerSpace.xs;
  const cellW = (width - ownerSpace.md * 2 - gridGap) / 2;

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | 'all'>('all');
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [actionsMenuClosing, setActionsMenuClosing] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const categoryOptions = categories;

  const filtered = useMemo(
    () => filterItems(items, query, category),
    [items, query, category],
  );

  const closeActionsMenu = useCallback(() => {
    setActionsMenuClosing(true);
    setTimeout(() => {
      setActionsMenuOpen(false);
      setActionsMenuClosing(false);
    }, MODAL_EXIT_MS);
  }, []);

  const openEditItemForm = useCallback((item: MenuItem) => {
    router.push(`/(staff)/menu-item-edit?id=${encodeURIComponent(item.id)}` as never);
  }, [router]);

  const openAddItemForm = useCallback(() => {
    closeActionsMenu();
    setTimeout(() => router.push('/(staff)/menu-item-edit' as never), MODAL_EXIT_MS + 30);
  }, [closeActionsMenu, router]);

  const openCategoryEditor = useCallback(() => {
    closeActionsMenu();
    setTimeout(() => router.push('/(staff)/menu-categories' as never), MODAL_EXIT_MS + 30);
  }, [closeActionsMenu, router]);

  const handleBack = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => {
      if (returnTo === 'profile') {
        router.replace('/(staff)/profile' as never);
        return;
      }
      if (returnTo === 'home') {
        router.replace('/(staff)/home' as never);
        return;
      }
      router.back();
    }, MODAL_EXIT_MS);
  }, [leaving, returnTo, router]);

  return (
    <View style={styles.screen}>
      {!leaving ? (
      <Animated.View
        entering={FadeIn.duration(160)}
        exiting={FadeOutDown.duration(MODAL_EXIT_MS)}
        style={styles.screenFill}
      >
      <OwnerScreen contentContainerStyle={[styles.scrollPad, { paddingBottom: ownerSpace.xl }]}>
        <Animated.View
          entering={FadeInDown.duration(260).springify().damping(18).stiffness(180)}
          style={styles.headRow}
        >
          <Pressable
            onPress={handleBack}
            hitSlop={10}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={28} color={ownerColors.gold} />
          </Pressable>
          <View style={styles.headText}>
            <Text style={styles.title}>{t('owner.menuTitle')}</Text>
            <Text style={styles.sub}>{t('owner.menuSubtitle')}</Text>
          </View>
          <Animated.View entering={FadeIn.delay(120).duration(160)}>
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [styles.topAddBtn, pressed && styles.topAddBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel={t('common.save')}
            >
              <Text style={styles.topAddBtnText}>{t('common.save')}</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(70).duration(240)} style={styles.toolbar}>
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
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(110).duration(240)}>
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
        </Animated.View>

        {filtered.length === 0 ? (
          <Animated.Text entering={FadeIn.duration(220)} style={styles.empty}>
            {t('common.noResults')}
          </Animated.Text>
        ) : (
          <View style={styles.gridWrap}>
            {chunk(filtered, 2).map((pair, rowIdx) => (
              <Animated.View
                key={rowIdx}
                entering={FadeInDown.delay(140 + rowIdx * 28).duration(260)}
                layout={LinearTransition.duration(180)}
                style={[styles.gridRow, { gap: gridGap }]}
              >
                {pair.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => openEditItemForm(item)}
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
              </Animated.View>
            ))}
          </View>
        )}

        <View style={{ height: ownerSpace.md }} />
      </OwnerScreen>
      <Animated.View entering={FadeIn.delay(160).duration(180)} style={styles.floatingAddWrap}>
        <Pressable
          onPress={() => setActionsMenuOpen(true)}
          style={({ pressed }) => [styles.floatingAddBtn, pressed && styles.topAddBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('owner.menuAddButton')}
        >
          <Ionicons name="add" size={18} color={ownerColors.gold} />
          <Text style={styles.floatingAddText}>Add</Text>
        </Pressable>
      </Animated.View>
      </Animated.View>
      ) : null}

      <Modal
        visible={actionsMenuOpen}
        animationType="none"
        transparent
        onRequestClose={closeActionsMenu}
      >
        <View style={styles.actionsModalRoot}>
          <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(MODAL_EXIT_MS)} style={StyleSheet.absoluteFillObject}>
            <MenuBackdrop onPress={closeActionsMenu} />
          </Animated.View>
          {!actionsMenuClosing ? (
            <Animated.View
              entering={FadeIn.duration(160)}
              exiting={FadeOut.duration(150)}
              style={styles.actionsCard}
            >
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
                onPress={openCategoryEditor}
              >
                <Ionicons name="create-outline" size={22} color={ownerColors.gold} />
                <Text style={styles.actionRowText}>{t('owner.menuActionEditCategories')}</Text>
                <Ionicons name="chevron-forward" size={18} color={ownerColors.textMuted} style={styles.actionChevron} />
              </Pressable>
              <View style={styles.actionDivider} />
              <Pressable
                style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
                onPress={() => {
                  closeActionsMenu();
                  setTimeout(() => Alert.alert(t('owner.menuActionImportMenu'), t('owner.menuImportComingSoon')), MODAL_EXIT_MS + 40);
                }}
              >
                <Ionicons name="download-outline" size={22} color={ownerColors.gold} />
                <Text style={styles.actionRowText}>{t('owner.menuActionImportMenu')}</Text>
                <Ionicons name="chevron-forward" size={18} color={ownerColors.textMuted} style={styles.actionChevron} />
              </Pressable>
            </Animated.View>
          ) : null}
        </View>
      </Modal>

    </View>
  );
}

const useStyles = createStyles((c) => {
  const ownerColors = ownerColorsFromPalette(c);
  return {
  screen: {
    flex: 1,
  },
  screenFill: {
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
  backBtn: {
    marginTop: 2,
    marginLeft: -6,
    paddingRight: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
  floatingAddWrap: {
    position: 'absolute',
    right: ownerSpace.md,
    bottom: ownerSpace.lg,
    zIndex: 5,
  },
  floatingAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.goldMuted,
    backgroundColor: ownerColors.bgSurface,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  floatingAddText: {
    fontSize: 14,
    fontWeight: '700',
    color: ownerColors.gold,
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
  };
});
