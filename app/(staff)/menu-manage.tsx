import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { useMenu } from '@/lib/context/MenuContext';
import type { MenuItem } from '@/lib/mock/menuItems';

// ── Styles ──────────────────────────────────────────────────────────────────

const useStyles = createStyles((c) => ({
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  card: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    minHeight: 52,
    gap: spacing.sm,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  rowPressed: { backgroundColor: c.bgElevated },
  itemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
  },
  itemNameUnavailable: { color: c.textMuted },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: c.gold,
    marginRight: 4,
  },
  saveMenuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: 14,
    borderRadius: borderRadius.xl,
    backgroundColor: c.gold,
  },
  saveMenuBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000',
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.gold,
    backgroundColor: c.bgElevated,
  },
  headerAddText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.gold,
  },

  // ── Edit modal ──
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.bgSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    maxHeight: '88%',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.3,
    marginBottom: spacing.lg,
  },
  fieldRow: {
    marginBottom: spacing.md,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.3,
  },
  input: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    backgroundColor: c.bgElevated,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  inputMultiline: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textPrimary,
    backgroundColor: c.bgElevated,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  photoPreview: {
    width: '100%',
    height: 140,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    marginBottom: spacing.sm,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.gold,
    backgroundColor: c.bgElevated,
  },
  photoBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: c.gold,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: c.danger,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: c.danger,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: borderRadius.full,
    backgroundColor: c.gold,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000',
  },
}));

// ── Edit sheet ───────────────────────────────────────────────────────────────

function EditItemSheet({
  item,
  onSave,
  onDelete,
  onClose,
}: {
  item: MenuItem | null;
  onSave: (changes: Partial<MenuItem>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isNew = !item?.id || item.id.startsWith('new_');

  const [name, setName] = useState(item?.name ?? '');
  const [price, setPrice] = useState(item ? String(item.price) : '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [category, setCategory] = useState(item?.category ?? '');
  const [photoUrl, setPhotoUrl] = useState(item?.photoUrl ?? '');

  React.useEffect(() => {
    if (item) {
      setName(item.name);
      setPrice(String(item.price));
      setDescription(item.description);
      setCategory(item.category);
      setPhotoUrl(item.photoUrl);
    }
  }, [item]);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo permission required', 'Allow photo access to choose a food photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUrl(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    const parsedPrice = parseFloat(price);
    if (!name.trim()) return Alert.alert('Name required');
    if (isNaN(parsedPrice) || parsedPrice < 0) return Alert.alert('Enter a valid price');
    onSave({ name: name.trim(), price: parsedPrice, description, category, photoUrl });
    onClose();
  };

  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable onPress={() => {}} style={styles.sheet}>
            <Text style={styles.sheetTitle}>{isNew ? 'New item' : 'Edit item'}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Food photo</Text>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.photoPreview} resizeMode="cover" />
              ) : null}
              <Pressable
                style={({ pressed }) => [styles.photoBtn, { opacity: pressed ? 0.75 : 1 }]}
                onPress={pickPhoto}
              >
                <Ionicons name="image-outline" size={18} color={c.gold} />
                <Text style={styles.photoBtnText}>{photoUrl ? 'Change photo' : 'Choose photo'}</Text>
              </Pressable>
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Tagliatelle al Ragù"
                placeholderTextColor={c.textMuted}
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Price</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor={c.textMuted}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Category</Text>
              <TextInput
                style={styles.input}
                value={category}
                onChangeText={setCategory}
                placeholder="e.g. Mains, Desserts, Drinks"
                placeholderTextColor={c.textMuted}
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={styles.inputMultiline}
                value={description}
                onChangeText={setDescription}
                placeholder="Short description of the dish"
                placeholderTextColor={c.textMuted}
                multiline
              />
            </View>

            <View style={styles.sheetActions}>
              {!isNew && (
                <Pressable
                  style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => { onDelete(); onClose(); }}
                >
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.85 : 1 }]}
                onPress={handleSave}
              >
                <Text style={styles.saveBtnText}>{t('common.done')}</Text>
              </Pressable>
            </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function MenuManageScreen() {
  const styles = useStyles();
  const c = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const { items, updateItem, addItem, removeItem } = useMenu();
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const byCategory = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const handleSave = (changes: Partial<MenuItem>) => {
    if (!editingItem) return;
    if (editingItem.id.startsWith('new_')) {
      addItem({ ...editingItem, ...changes });
    } else {
      updateItem(editingItem.id, changes);
    }
  };

  const handleAddNew = () => {
    setEditingItem({
      id: `new_${Date.now()}`,
      restaurantId: 'r1',
      name: '',
      description: '',
      price: 0,
      category: '',
      photoUrl: '',
      allergens: [],
      dietaryFlags: [],
      isAvailable: true,
      isPreorderable: false,
      isFeatured: false,
      preparationTimeMinutes: 15,
      calories: 0,
    });
  };

  return (
    <OwnerScreen
      header={(
        <SubpageHeader
          title="Menu"
          subtitle="Manage your dishes & prices"
          fallbackTab="more"
          accentBack
          onBack={() => router.replace('/(staff)/profile' as never)}
          rightAction={(
            <Pressable
              onPress={handleAddNew}
              style={({ pressed }) => [styles.headerAddBtn, { opacity: pressed ? 0.75 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Add item"
            >
              <Ionicons name="add" size={17} color={c.gold} />
              <Text style={styles.headerAddText}>Add</Text>
            </Pressable>
          )}
        />
      )}
    >
      {Object.entries(byCategory).map(([category, catItems]) => (
        <View key={category}>
          <Text style={styles.sectionLabel}>{category}</Text>
          <View style={styles.card}>
            {catItems.map((item, i) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.row, i > 0 && styles.rowDivider, pressed && styles.rowPressed]}
                onPress={() => setEditingItem(item)}
                accessibilityRole="button"
              >
                <Text
                  style={[styles.itemName, !item.isAvailable && styles.itemNameUnavailable]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {!item.isAvailable && (
                  <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: '600' }}>OFF</Text>
                )}
                <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                <Ionicons name="chevron-forward" size={15} color={c.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <Pressable
        style={({ pressed }) => [styles.saveMenuBtn, { opacity: pressed ? 0.85 : 1 }]}
        onPress={() => router.replace('/(staff)/profile' as never)}
        accessibilityRole="button"
        accessibilityLabel={t('common.save')}
      >
        <Text style={styles.saveMenuBtnText}>{t('common.save')}</Text>
      </Pressable>

      <EditItemSheet
        item={editingItem}
        onSave={handleSave}
        onDelete={() => editingItem && removeItem(editingItem.id)}
        onClose={() => setEditingItem(null)}
      />
    </OwnerScreen>
  );
}
