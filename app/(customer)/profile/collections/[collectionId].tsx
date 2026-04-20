import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SnapGrid } from '@/components/snaps/SnapGrid';
import {
  getCollectionById,
  getCollectionPosts,
  removePostFromCollection,
} from '@/lib/mock/collections';
import type { SnapPost } from '@/lib/mock/snaps';
import { mockCustomer } from '@/lib/mock/users';
import { colors, spacing, typography } from '@/lib/theme';

const ME = mockCustomer.id;

export default function CollectionDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { collectionId } = useLocalSearchParams<{ collectionId: string }>();

  const [posts, setPosts] = useState<SnapPost[]>(() =>
    collectionId ? getCollectionPosts(ME, collectionId) : [],
  );
  const [collection, setCollection] = useState(() =>
    collectionId ? getCollectionById(ME, collectionId) : undefined,
  );

  useFocusEffect(
    useCallback(() => {
      if (!collectionId) return;
      setPosts(getCollectionPosts(ME, collectionId));
      setCollection(getCollectionById(ME, collectionId));
    }, [collectionId]),
  );

  const handleLongPress = (post: SnapPost) => {
    if (!collectionId) return;
    Alert.alert(
      t('collections.removeConfirmTitle'),
      t('collections.removeConfirmBody'),
      [
        { text: t('collections.cancel'), style: 'cancel' },
        {
          text: t('collections.remove'),
          style: 'destructive',
          onPress: () => {
            removePostFromCollection(ME, collectionId, post.id);
            setPosts(getCollectionPosts(ME, collectionId));
          },
        },
      ],
    );
  };

  if (!collection) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('collections.notFound')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>{collection.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subHeaderText}>
          {t('collections.postCount', { count: posts.length })}
        </Text>
        <Text style={styles.hint}>{t('collections.longPressHint')}</Text>
      </View>

      <SnapGrid
        posts={posts}
        onLongPressTile={handleLongPress}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        emptyLabel={t('collections.emptyDetail')}
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
  subHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  subHeaderText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  hint: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontSize: 11,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
