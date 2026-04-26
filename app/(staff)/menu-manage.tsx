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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: 14,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: c.gold,
    borderStyle: 'dashed',
  },
  addBtnText: {
    fontSize: 15,
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
  const isNew = !item?.id || item.id.startsWith('new_');

  const [name, setName] = useState(item?.name ?? '');
  const [price, setPrice] = useState(item ? String(item.price) : '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [category, setCategory] = useState(item?.category ?? '');

  React.useEffect(() => {
    if (item) {
      setName(item.name);
      setPrice(String(item.price));
      setDescription(item.description);
      setCategory(item.category);
    }
  }, [item]);

  const handleSave = () => {
    const parsedPrice = parseFloat(price);
    if (!name.trim()) return Alert.alert('Name required');
    if (isNaN(parsedPrice) || parsedPrice < 0) return Alert.alert('Enter a valid price');
    onSave({ name: name.trim(), price: parsedPrice, description, category });
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
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
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
        style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.7 : 1 }]}
        onPress={handleAddNew}
        accessibilityRole="button"
      >
        <Ionicons name="add-circle-outline" size={20} color={c.gold} />
        <Text style={styles.addBtnText}>Add item</Text>
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
