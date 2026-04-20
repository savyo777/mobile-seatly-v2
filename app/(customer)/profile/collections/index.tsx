import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Href, useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  createCollection,
  listCollections,
  type Collection,
} from '@/lib/mock/collections';
import { getSnapPostById } from '@/lib/mock/snaps';
import { mockCustomer } from '@/lib/mock/users';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';

const ME = mockCustomer.id;

export default function CollectionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [collections, setCollections] = useState<Collection[]>(() => listCollections(ME));
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  useFocusEffect(
    useCallback(() => {
      setCollections(listCollections(ME));
    }, []),
  );

  const refresh = () => setCollections(listCollections(ME));

  const handleCreate = () => {
    if (!newName.trim()) return;
    createCollection(ME, newName.trim());
    setNewName('');
    setCreating(false);
    refresh();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>{t('collections.title')}</Text>
        <Pressable onPress={() => setCreating((v) => !v)} hitSlop={10}>
          <Ionicons name={creating ? 'close' : 'add'} size={24} color={colors.gold} />
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
      ) : null}

      <FlatList
        data={collections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl, paddingTop: spacing.md }}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md, paddingHorizontal: spacing.md }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => {
          const cover = item.coverPostId ? getSnapPostById(item.coverPostId)?.image : undefined;
          return (
            <Pressable
              onPress={() =>
                router.push(`/(customer)/profile/collections/${item.id}` as Href)
              }
              style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.cover}>
                {cover ? (
                  <Image source={{ uri: cover }} style={styles.coverImg} />
                ) : (
                  <Ionicons name="bookmark-outline" size={24} color={colors.textMuted} />
                )}
              </View>
              <Text style={styles.tileName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.tileMeta}>
                {t('collections.postCount', { count: item.postIds.length })}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="albums-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>{t('collections.empty')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  topBarTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
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
    paddingVertical: 9,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gold,
  },
  primaryBtnText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.bgBase,
  },
  tile: {
    flex: 1,
    gap: 4,
  },
  cover: {
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  tileName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  tileMeta: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing['4xl'],
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
