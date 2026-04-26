import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { useMenu } from '@/lib/context/MenuContext';
import { createStyles } from '@/lib/theme';
import { ownerColorsFromPalette, ownerRadii, ownerSpace, useOwnerColors } from '@/lib/theme/ownerTheme';

export default function MenuCategoriesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const ownerColors = useOwnerColors();
  const styles = useStyles();
  const { items, categories, reorderCategories, addCategory, renameCategory, removeCategory } = useMenu();

  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState('');

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
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <OwnerScreen contentContainerStyle={styles.scrollPad}>
          <Animated.View entering={FadeInDown.duration(260)} style={styles.headRow}>
            <Pressable
              onPress={() => router.back()}
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
            <Text style={styles.fieldLabel}>{t('owner.menuCategoryAddSectionLabel')}</Text>
            <View style={styles.categoryAddRow}>
              <TextInput
                value={newCategoryName}
                onChangeText={(value) => {
                  setNewCategoryName(value);
                  if (categoryError) setCategoryError('');
                }}
                style={[styles.input, styles.categoryInput]}
                placeholder={t('owner.menuCategoryNamePlaceholder')}
                placeholderTextColor={ownerColors.textMuted}
                returnKeyType="done"
                onSubmitEditing={handleAdd}
              />
              <Pressable
                onPress={handleAdd}
                style={({ pressed }) => [styles.categoryAddBtn, pressed && styles.rowPressed]}
                accessibilityRole="button"
                accessibilityLabel={t('owner.menuActionAddCategory')}
              >
                <Ionicons name="add" size={18} color={ownerColors.gold} />
                <Text style={styles.categoryAddBtnText}>{t('owner.menuAddCategoryShort')}</Text>
              </Pressable>
            </View>
            {categoryError ? <Text style={styles.categoryError}>{categoryError}</Text> : null}
          </Animated.View>
        </OwnerScreen>

        <View style={styles.listWrap}>
          <DraggableFlatList
            data={categories}
            keyExtractor={(cat) => cat}
            onDragEnd={({ data }) => reorderCategories(data)}
            activationDistance={8}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const useStyles = createStyles((c) => {
  const ownerColors = ownerColorsFromPalette(c);
  return {
    screen: { flex: 1 },
    flex: { flex: 1 },
    scrollPad: { paddingTop: 2, paddingBottom: ownerSpace.md },
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
    categoryAddBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      height: 44,
      paddingHorizontal: ownerSpace.sm,
      borderRadius: ownerRadii.sm,
      backgroundColor: ownerColors.goldSubtle,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ownerColors.goldMuted,
    },
    categoryAddBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: ownerColors.gold,
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
    rowPressed: {
      opacity: 0.9,
      backgroundColor: ownerColors.bgGlass,
    },
  };
});
