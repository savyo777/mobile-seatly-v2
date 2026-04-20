import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  addPostToCollection,
  createCollection,
  getCollectionsContainingPost,
  listCollections,
  removePostFromCollection,
  type Collection,
} from '@/lib/mock/collections';
import { getSnapPostById } from '@/lib/mock/snaps';
import { mockCustomer } from '@/lib/mock/users';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';

const ME = mockCustomer.id;

type Props = {
  visible: boolean;
  postId: string | null;
  onClose: () => void;
  onSaved?: () => void;
};

export function SaveToCollectionSheet({ visible, postId, onClose, onSaved }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [version, setVersion] = useState(0);

  const collections = useMemo<Collection[]>(
    () => (visible ? listCollections(ME) : []),
    [visible, version],
  );

  const containing = useMemo(() => {
    if (!postId || !visible) return new Set<string>();
    return new Set(getCollectionsContainingPost(ME, postId).map((c) => c.id));
  }, [postId, visible, version]);

  const bumpVersion = () => setVersion((v) => v + 1);

  const handleToggle = (collectionId: string) => {
    if (!postId) return;
    if (containing.has(collectionId)) {
      removePostFromCollection(ME, collectionId, postId);
    } else {
      addPostToCollection(ME, collectionId, postId);
      onSaved?.();
    }
    bumpVersion();
  };

  const handleCreate = () => {
    if (!newName.trim() || !postId) return;
    const col = createCollection(ME, newName.trim());
    addPostToCollection(ME, col.id, postId);
    setNewName('');
    setCreating(false);
    onSaved?.();
    bumpVersion();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.grabber} />
            <View style={styles.header}>
              <Text style={styles.title}>{t('collections.saveTitle')}</Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>

            {creating ? (
              <View style={styles.createRow}>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder={t('collections.newNamePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleCreate}
                />
                <Pressable
                  onPress={handleCreate}
                  disabled={!newName.trim()}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    (!newName.trim() || pressed) && { opacity: 0.5 },
                  ]}
                >
                  <Text style={styles.primaryBtnText}>{t('collections.create')}</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setCreating(true)} style={styles.newCollectionRow}>
                <View style={styles.newCollectionIcon}>
                  <Ionicons name="add" size={24} color={colors.gold} />
                </View>
                <Text style={styles.newCollectionText}>
                  {t('collections.newCollection')}
                </Text>
              </Pressable>
            )}

            <FlatList
              data={collections}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isIn = containing.has(item.id);
                const cover = item.coverPostId
                  ? getSnapPostById(item.coverPostId)?.image
                  : undefined;
                return (
                  <Pressable
                    onPress={() => handleToggle(item.id)}
                    style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
                  >
                    <View style={styles.cover}>
                      {cover ? (
                        <Image source={{ uri: cover }} style={styles.coverImg} />
                      ) : (
                        <Ionicons name="bookmark" size={20} color={colors.textMuted} />
                      )}
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowName}>{item.name}</Text>
                      <Text style={styles.rowMeta}>
                        {t('collections.postCount', { count: item.postIds.length })}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        isIn && styles.checkboxOn,
                      ]}
                    >
                      {isIn ? (
                        <Ionicons name="checkmark" size={16} color={colors.bgBase} />
                      ) : null}
                    </View>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>{t('collections.emptyOnSheet')}</Text>
                </View>
              }
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 400 }}
            />
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  newCollectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  newCollectionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(201,168,76,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newCollectionText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.gold,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    backgroundColor: colors.bgElevated,
  },
  primaryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gold,
  },
  primaryBtnText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.bgBase,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rowMeta: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  empty: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
});
