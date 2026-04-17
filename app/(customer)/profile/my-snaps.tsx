import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listSnapPostsByUser, type SnapPost } from '@/lib/mock/snaps';
import { mockCustomer } from '@/lib/mock/users';
import { SnapViewerModal } from '@/components/discover/SnapViewerModal';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';

const COLS = 3;
const GAP = 6;
const H_PAD = 10;

function tileSize() {
  const w = Dimensions.get('window').width;
  return (w - H_PAD * 2 - GAP * (COLS - 1)) / COLS;
}

export default function MySnapsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<SnapPost[]>(() => listSnapPostsByUser(mockCustomer.id));
  const [activePost, setActivePost] = useState<SnapPost | null>(null);

  useFocusEffect(
    useCallback(() => {
      setPosts(listSnapPostsByUser(mockCustomer.id));
    }, []),
  );

  const size = tileSize();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          onPress={() => router.back()}
          style={styles.backHit}
        >
          <Ionicons name="chevron-back" size={26} color={colors.gold} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t('profile.mySnaps')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {posts.length === 0 ? (
        <View style={[styles.emptyWrap, { paddingBottom: insets.bottom + spacing.xl }]}>
          <Text style={styles.emptyText}>{t('profile.mySnapsEmpty')}</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          numColumns={COLS}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
          columnWrapperStyle={styles.columnWrap}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setActivePost(item)}
              style={({ pressed }) => [styles.tile, { width: size, height: size }, pressed && styles.tilePressed]}
            >
              <Image source={{ uri: item.image }} style={styles.tileImage} />
            </Pressable>
          )}
        />
      )}

      <SnapViewerModal visible={!!activePost} post={activePost} onClose={() => setActivePost(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 44,
  },
  listContent: {
    paddingHorizontal: H_PAD,
    paddingTop: GAP,
  },
  columnWrap: {
    gap: GAP,
    marginBottom: GAP,
  },
  tile: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.bgElevated,
  },
  tilePressed: {
    opacity: 0.92,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
