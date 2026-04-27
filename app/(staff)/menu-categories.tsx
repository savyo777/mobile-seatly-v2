import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMenu } from '@/lib/context/MenuContext';
import { createStyles } from '@/lib/theme';
import { ownerColorsFromPalette, ownerRadii, ownerSpace, useOwnerColors } from '@/lib/theme/ownerTheme';

export default function MenuCategoriesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const ownerColors = useOwnerColors();
  const styles = useStyles();
  const { items, categories, reorderCategories, addCategory, renameCategory, removeCategory } = useMenu();

  const [searchQuery, setSearchQuery] = useState('');
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState('');

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((cat) => cat.toLowerCase().includes(query));
  }, [categories, searchQuery]);

  const openAddSheet = useCallback(() => {
    setNewCategoryName('');
    setCategoryError('');
    setAddSheetOpen(true);
  }, []);

  const closeAddSheet = useCallback(() => {
    setAddSheetOpen(false);
    setNewCategoryName('');
    setCategoryError('');
  }, []);

  const handleAdd = useCallback(() => {
    const trimmed = newCategoryName.trim();
    const result = addCategory(trimmed);
    if (!result.ok) {
      setCategoryError(
        result.reason === 'duplicate'
          ? t('owner.menuCategoryAlreadyExists')
          : t('owner.menuCategoryNameRequired'),
      );
      return;
    }
    setNewCategoryName('');
    setCategoryError('');
    setAddSheetOpen(false);
  }, [addCategory, newCategoryName, t]);

  const startRename = useCallback((name: string) => {
    setRenamingCategory(name);
    setRenamingValue(name);
  }, []);

  const saveRename = useCallback(() => {
    if (!renamingCategory) return;
    const result = renameCategory(renamingCategory, renamingValue);
    if (!result.ok) {
      Alert.alert(
        t('common.error'),
        result.reason === 'duplicate'
          ? t('owner.menuCategoryAlreadyExists')
          : t('owner.menuCategoryNameRequired'),
      );
      return;
    }
    setRenamingCategory(null);
    setRenamingValue('');
  }, [renameCategory, renamingCategory, renamingValue, t]);

  const handleDelete = useCallback((name: string) => {
    const itemCount = items.filter((i) => i.category === name).length;
    if (itemCount > 0) {
      Alert.alert(
        t('owner.menuCategoryDeleteBlockedTitle'),
        t('owner.menuCategoryDeleteBlockedBody', { count: itemCount, name }),
      );
      return;
    }
    Alert.alert(
      t('owner.menuCategoryDeleteTitle', { name }),
      t('owner.menuCategoryDeleteConfirm'),
      [
        { text: t('owner.menuCancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => removeCategory(name) },
      ],
    );
  }, [items, removeCategory, t]);

  const renderItem = useCallback(({ item: cat, drag, isActive }: RenderItemParams<string>) => {
    const itemCount = items.filter((i) => i.category === cat).length;
    const isRenaming = renamingCategory === cat;
    return (
      <ScaleDecorator>
        <View style={[styles.categoryRow, isActive && styles.categoryRowActive]}>
          {isRenaming ? (
            <>
              <TextInput
                value={renamingValue}
                onChangeText={setRenamingValue}
                style={[styles.input, styles.categoryRenameInput]}
                placeholder={t('owner.menuCategoryNamePlaceholder')}
                placeholderTextColor={ownerColors.textMuted}
                autoFocus
              />
              <Pressable onPress={saveRename} style={({ pressed }) => [styles.categoryDoneBtn, pressed && styles.rowPressed]}>
                <Text style={styles.categoryDoneText}>{t('common.done')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                onLongPress={drag}
                delayLongPress={150}
                style={({ pressed }) => [styles.categoryDragHandle, pressed && styles.rowPressed]}
                accessibilityRole="button"
                accessibilityLabel={t('owner.menuCategoryDragA11y', { name: cat })}
              >
                <Ionicons name="reorder-three-outline" size={22} color={ownerColors.textMuted} />
              </Pressable>
              <Pressable
                onPress={() => startRename(cat)}
                onLongPress={drag}
                delayLongPress={250}
                style={({ pressed }) => [styles.categoryTextWrap, pressed && styles.rowPressed]}
                accessibilityRole="button"
                accessibilityLabel={t('owner.menuCategoryRenameA11y', { name: cat })}
              >
                <Text style={styles.categoryName}>{cat}</Text>
                <Text style={styles.categoryMeta}>
                  {t('owner.menuCategoryItemCount', { count: itemCount })}
                </Text>
              </Pressable>
              <View style={styles.categoryActions}>
                <Pressable
                  onPress={() => startRename(cat)}
                  style={({ pressed }) => [styles.categoryIconBtn, pressed && styles.rowPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={t('owner.menuCategoryRenameA11y', { name: cat })}
                >
                  <Ionicons name="create-outline" size={18} color={ownerColors.gold} />
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(cat)}
                  style={({ pressed }) => [styles.categoryIconBtn, pressed && styles.rowPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={t('owner.menuCategoryDeleteA11y', { name: cat })}
                >
                  <Ionicons name="trash-outline" size={18} color={ownerColors.danger} />
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScaleDecorator>
    );
  }, [handleDelete, items, ownerColors, renamingCategory, renamingValue, saveRename, startRename, styles, t]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.headerWrap}>
          <Animated.View entering={FadeInDown.duration(260)} style={styles.headRow}>
            <Pressable
              onPress={() => router.replace('/(staff)/menu' as never)}
              hitSlop={10}
              style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
            >
              <Ionicons name="chevron-back" size={28} color={ownerColors.gold} />
            </Pressable>
            <View style={styles.headText}>
              <Text style={styles.title}>{t('owner.menuEditCategories')}</Text>
              <Text style={styles.sub}>{t('owner.menuCategoryDragHint')}</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(80).duration(220)}>
            <View style={styles.categoryAddRow}>
              <View style={styles.searchWrap}>
                <Ionicons name="search-outline" size={18} color={ownerColors.textMuted} style={styles.searchIcon} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={styles.searchInput}
                  placeholder={t('owner.menuCategorySearchPlaceholder')}
                  placeholderTextColor={ownerColors.textMuted}
                  returnKeyType="search"
                />
              </View>
              <Pressable
                onPress={openAddSheet}
                style={({ pressed }) => [styles.categoryAddIconBtn, pressed && styles.rowPressed]}
                accessibilityRole="button"
                accessibilityLabel={t('owner.menuActionAddCategory')}
              >
                <Ionicons name="add" size={22} color={ownerColors.gold} />
              </Pressable>
            </View>
          </Animated.View>
        </View>

        <View style={styles.listWrap}>
          <DraggableFlatList
            data={filteredCategories}
            keyExtractor={(cat) => cat}
            onDragEnd={({ data }) => {
              if (!searchQuery.trim()) reorderCategories(data);
            }}
            activationDistance={8}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        </View>

        <Modal visible={addSheetOpen} animationType="fade" transparent onRequestClose={closeAddSheet}>
          <Pressable style={styles.sheetBackdrop} onPress={closeAddSheet}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.sheetKeyboard}
            >
              <Pressable style={styles.addSheet} onPress={() => undefined}>
                <Text style={styles.sheetTitle}>{t('owner.menuActionAddCategory')}</Text>
                <Text style={styles.sheetSub}>{t('owner.menuCategoryAddHint')}</Text>
                <TextInput
                  value={newCategoryName}
                  onChangeText={(value) => {
                    setNewCategoryName(value);
                    if (categoryError) setCategoryError('');
                  }}
                  style={styles.input}
                  placeholder={t('owner.menuCategoryNamePlaceholder')}
                  placeholderTextColor={ownerColors.textMuted}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleAdd}
                />
                {categoryError ? <Text style={styles.categoryError}>{categoryError}</Text> : null}
                <View style={styles.sheetActions}>
                  <Pressable onPress={closeAddSheet} style={({ pressed }) => [styles.sheetSecondary, pressed && styles.rowPressed]}>
                    <Text style={styles.sheetSecondaryText}>{t('owner.menuCancel')}</Text>
                  </Pressable>
                  <Pressable onPress={handleAdd} style={({ pressed }) => [styles.sheetPrimary, pressed && styles.rowPressed]}>
                    <Text style={styles.sheetPrimaryText}>{t('owner.menuAddCategoryShort')}</Text>
                  </Pressable>
                </View>
              </Pressable>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = createStyles((c) => {
  const ownerColors = ownerColorsFromPalette(c);
  return {
    screen: { flex: 1, backgroundColor: c.bgBase },
    flex: { flex: 1 },
    headerWrap: {
      paddingHorizontal: ownerSpace.md,
      paddingTop: ownerSpace.sm,
      paddingBottom: ownerSpace.sm,
    },
    headRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: ownerSpace.sm,
      marginBottom: ownerSpace.sm,
    },
    backBtn: {
      marginTop: 2,
      marginLeft: -6,
      paddingRight: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headText: { flex: 1, minWidth: 0 },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: ownerColors.text,
      marginBottom: 4,
      letterSpacing: -0.4,
    },
    sub: {
      fontSize: 14,
      color: ownerColors.textMuted,
      fontWeight: '500',
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
    categoryAddRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: ownerSpace.sm,
      marginBottom: ownerSpace.sm,
    },
    categoryInput: { flex: 1 },
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
    searchIcon: { marginRight: 6 },
    searchInput: {
      flex: 1,
      minHeight: 40,
      color: ownerColors.text,
      fontSize: 15,
    },
    categoryAddIconBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: ownerRadii.md,
      backgroundColor: ownerColors.goldSubtle,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ownerColors.goldMuted,
    },
    categoryError: {
      marginTop: -4,
      marginBottom: ownerSpace.sm,
      fontSize: 12,
      fontWeight: '600',
      color: ownerColors.danger,
    },
    listWrap: {
      flex: 1,
      paddingHorizontal: ownerSpace.md,
    },
    listContent: { paddingBottom: ownerSpace.xl },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: ownerSpace.sm,
      paddingVertical: ownerSpace.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: ownerColors.border,
    },
    categoryRowActive: {
      backgroundColor: ownerColors.bgGlass,
      borderRadius: ownerRadii.sm,
    },
    categoryDragHandle: {
      width: 32,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 4,
    },
    categoryTextWrap: { flex: 1, minWidth: 0 },
    categoryName: {
      fontSize: 15,
      fontWeight: '700',
      color: ownerColors.text,
    },
    categoryMeta: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: '600',
      color: ownerColors.textMuted,
    },
    categoryRenameInput: { flex: 1 },
    categoryActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    categoryIconBtn: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: ownerRadii.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ownerColors.border,
    },
    categoryDoneBtn: {
      paddingVertical: 9,
      paddingHorizontal: ownerSpace.sm,
      borderRadius: ownerRadii.sm,
      backgroundColor: ownerColors.goldSubtle,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ownerColors.goldMuted,
    },
    categoryDoneText: {
      fontSize: 13,
      fontWeight: '700',
      color: ownerColors.gold,
    },
    sheetBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheetKeyboard: {
      width: '100%',
    },
    addSheet: {
      backgroundColor: ownerColors.bgSurface,
      borderTopLeftRadius: ownerRadii.xl,
      borderTopRightRadius: ownerRadii.xl,
      padding: ownerSpace.md,
      paddingBottom: ownerSpace.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ownerColors.border,
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: ownerColors.text,
      letterSpacing: -0.25,
      marginBottom: 4,
    },
    sheetSub: {
      fontSize: 13,
      fontWeight: '500',
      color: ownerColors.textMuted,
      marginBottom: ownerSpace.md,
    },
    sheetActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: ownerSpace.sm,
      marginTop: ownerSpace.md,
    },
    sheetSecondary: {
      paddingVertical: 11,
      paddingHorizontal: ownerSpace.md,
      borderRadius: ownerRadii.md,
    },
    sheetSecondaryText: {
      fontSize: 15,
      fontWeight: '700',
      color: ownerColors.textMuted,
    },
    sheetPrimary: {
      paddingVertical: 11,
      paddingHorizontal: ownerSpace.lg,
      borderRadius: ownerRadii.md,
      backgroundColor: ownerColors.goldSubtle,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ownerColors.goldMuted,
    },
    sheetPrimaryText: {
      fontSize: 15,
      fontWeight: '800',
      color: ownerColors.gold,
    },
    rowPressed: {
      opacity: 0.9,
      backgroundColor: ownerColors.bgGlass,
    },
  };
});
