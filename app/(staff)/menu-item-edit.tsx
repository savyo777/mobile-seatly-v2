import React, { useCallback, useMemo, useState } from 'react';
import {
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
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { useMenu } from '@/lib/context/MenuContext';
import { type MenuItem } from '@/lib/mock/menuItems';
import { createStyles } from '@/lib/theme';
import { ownerColorsFromPalette, ownerRadii, ownerSpace, useOwnerColors } from '@/lib/theme/ownerTheme';
import { normalizeMoneyInput, normalizeTextInput, sanitizeMoneyInput, sanitizeTextInput } from '@/lib/validation/input';
import { useAuthSession } from '@/lib/auth/AuthContext';

const MENU_MUTATION_ROLES = new Set(['owner', 'manager', 'diner_and_owner']);

export default function MenuItemEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const ownerColors = useOwnerColors();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { ownerRestaurantId, items, addItem, updateItem, removeItem, categories } = useMenu();
  const { role } = useAuthSession();
  const canMutateMenu = role ? MENU_MUTATION_ROLES.has(role.toLowerCase()) : false;

  const editingItem = useMemo(() => (id ? items.find((i) => i.id === id) ?? null : null), [id, items]);
  const isEditing = editingItem != null;

  const [formName, setFormName] = useState(editingItem?.name ?? '');
  const [formPrice, setFormPrice] = useState(editingItem ? String(editingItem.price) : '');
  const [formDesc, setFormDesc] = useState(editingItem?.description ?? '');
  const [formCategory, setFormCategory] = useState(editingItem?.category ?? categories[0] ?? 'Mains');
  const [formAvailable] = useState(editingItem?.isAvailable ?? true);
  const [formPhotoUri, setFormPhotoUri] = useState<string | null>(null);

  const currentPhotoUri = formPhotoUri ?? editingItem?.photoUrl ?? null;

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

  const save = useCallback(() => {
    const price = normalizeMoneyInput(formPrice);
    const cleanName = normalizeTextInput(formName, { maxLength: 120 });
    const cleanDescription = normalizeTextInput(formDesc, { maxLength: 500, multiline: true });
    const cleanCategory = normalizeTextInput(formCategory, { maxLength: 80 });
    if (!cleanName || price === null || price < 0) {
      Alert.alert(t('common.error'), 'Enter a valid name and price.');
      return;
    }
    const changes: Pick<MenuItem, 'name' | 'description' | 'price' | 'category' | 'photoUrl' | 'isAvailable'> = {
      name: cleanName,
      description: cleanDescription || '—',
      price,
      category: cleanCategory || 'Mains',
      photoUrl: formPhotoUri ?? editingItem?.photoUrl ?? '',
      isAvailable: formAvailable,
    };

    if (editingItem) {
      updateItem(editingItem.id, changes);
    } else {
      addItem({
        id: `local-${Date.now()}`,
        restaurantId: ownerRestaurantId ?? '',
        name: changes.name,
        description: changes.description,
        price: changes.price,
        category: changes.category,
        photoUrl: changes.photoUrl,
        allergens: [],
        dietaryFlags: [],
        isAvailable: changes.isAvailable,
        isPreorderable: true,
        isFeatured: false,
        preparationTimeMinutes: 15,
      });
    }
    router.replace('/(staff)/menu' as never);
  }, [addItem, editingItem, formAvailable, formCategory, formDesc, formName, formPhotoUri, formPrice, ownerRestaurantId, router, t, updateItem]);

  const handleDelete = useCallback(() => {
    if (!editingItem) return;
    if (!canMutateMenu) {
      Alert.alert(
        t('common.notAllowed', { defaultValue: 'Not allowed' }),
        t('owner.menuItemDeleteNotAllowed', {
          defaultValue: 'Only owners and managers can delete menu items.',
        }),
      );
      return;
    }
    Alert.alert(
      t('owner.menuItemDeleteTitle', { name: editingItem.name }),
      t('owner.menuItemDeleteConfirm'),
      [
        { text: t('owner.menuCancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            removeItem(editingItem.id);
            router.replace('/(staff)/menu' as never);
          },
        },
      ],
    );
  }, [canMutateMenu, editingItem, removeItem, router, t]);

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <OwnerScreen contentContainerStyle={styles.scrollPad}>
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
              <Text style={styles.title}>
                {isEditing ? t('owner.menuEditItem') : t('owner.menuAddItemTitle')}
              </Text>
            </View>
            <Pressable
              onPress={save}
              style={({ pressed }) => [styles.saveBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel={t('common.save')}
            >
              <Text style={styles.saveBtnText}>{t('common.save')}</Text>
            </Pressable>
          </Animated.View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>{t('owner.menuItemPhoto')}</Text>
            {currentPhotoUri ? (
              <Image source={{ uri: currentPhotoUri }} style={styles.previewImg} />
            ) : null}
            <Pressable onPress={pickPhoto} style={({ pressed }) => [styles.photoBtn, pressed && styles.rowPressed]}>
              <Ionicons name="image-outline" size={20} color={ownerColors.gold} />
              <Text style={styles.photoBtnText}>
                {currentPhotoUri ? t('owner.menuItemChangePhoto') : t('owner.menuItemAddPhoto')}
              </Text>
            </Pressable>

            <Text style={styles.fieldLabel}>{t('owner.menuItemName')}</Text>
            <TextInput
              value={formName}
              onChangeText={(value) => setFormName(sanitizeTextInput(value, { maxLength: 120 }))}
              style={styles.input}
              placeholderTextColor={ownerColors.textMuted}
            />

            <Text style={styles.fieldLabel}>{t('owner.menuItemPrice')}</Text>
            <TextInput
              value={formPrice}
              onChangeText={(value) => setFormPrice(sanitizeMoneyInput(value))}
              keyboardType="decimal-pad"
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={ownerColors.textMuted}
            />

            <Text style={styles.fieldLabel}>{t('owner.menuItemCategory')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChips}>
              {categories.map((c) => (
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
              onChangeText={(value) => setFormDesc(sanitizeTextInput(value, { maxLength: 500, multiline: true }))}
              style={[styles.input, styles.inputMultiline]}
              multiline
              placeholderTextColor={ownerColors.textMuted}
            />

            {isEditing && canMutateMenu ? (
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [styles.deleteBtn, pressed && styles.btnPressed]}
                accessibilityRole="button"
                accessibilityLabel={t('owner.menuItemDeleteA11y', { name: editingItem?.name ?? '' })}
              >
                <Ionicons name="trash-outline" size={18} color={ownerColors.danger} />
                <Text style={styles.deleteBtnText}>{t('owner.menuItemDelete')}</Text>
              </Pressable>
            ) : null}

            <View style={{ height: ownerSpace.xl }} />
          </ScrollView>
        </OwnerScreen>
      </KeyboardAvoidingView>
    </View>
  );
}

const useStyles = createStyles((c) => {
  const ownerColors = ownerColorsFromPalette(c);
  return {
    screen: { flex: 1 },
    flex: { flex: 1 },
    scrollPad: { paddingTop: 2, paddingBottom: ownerSpace.xl },
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
      letterSpacing: -0.4,
    },
    saveBtn: {
      marginTop: 2,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: ownerRadii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ownerColors.goldMuted,
      backgroundColor: ownerColors.goldSubtle,
    },
    saveBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: ownerColors.gold,
      letterSpacing: 0.2,
    },
    btnPressed: { opacity: 0.85 },
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
    photoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: ownerSpace.sm,
      paddingVertical: ownerSpace.sm,
    },
    photoBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: ownerColors.gold,
    },
    previewImg: {
      width: '100%',
      height: 160,
      borderRadius: ownerRadii.md,
      marginTop: ownerSpace.sm,
      backgroundColor: ownerColors.bgElevated,
    },
    rowPressed: {
      opacity: 0.9,
      backgroundColor: ownerColors.bgGlass,
    },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: ownerSpace.lg,
      paddingVertical: 14,
      borderRadius: ownerRadii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: ownerColors.danger,
      backgroundColor: 'transparent',
    },
    deleteBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: ownerColors.danger,
    },
  };
});
