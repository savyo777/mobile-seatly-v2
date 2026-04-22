import React, { useCallback } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
  type ListRenderItem,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Href, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { SnapPost } from '@/lib/mock/snaps';
import { createStyles, spacing, typography } from '@/lib/theme';

const SCREEN_W = Dimensions.get('window').width;
const GUTTER = 2;
const TILE = (SCREEN_W - GUTTER * 2) / 3;

type Props = {
  posts: SnapPost[];
  onPressTile?: (post: SnapPost) => void;
  onLongPressTile?: (post: SnapPost) => void;
  ListHeaderComponent?: React.ComponentType<unknown> | React.ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollEnabled?: boolean;
  emptyLabel?: string;
};

const useStyles = createStyles((c) => ({
  row: {
    gap: GUTTER,
    marginBottom: GUTTER,
  },
  tile: {
    width: TILE,
    height: TILE,
    backgroundColor: c.bgElevated,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  badgeText: {
    ...typography.bodySmall,
    color: '#fff',
    fontWeight: '700',
    fontSize: 10,
  },
  empty: {
    paddingTop: spacing['4xl'],
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: c.textMuted,
  },
}));

export function SnapGrid({
  posts,
  onPressTile,
  onLongPressTile,
  ListHeaderComponent,
  contentContainerStyle,
  scrollEnabled = true,
  emptyLabel = 'No posts yet',
}: Props) {
  const router = useRouter();
  const styles = useStyles();

  const handlePress = useCallback(
    (post: SnapPost) => {
      if (onPressTile) return onPressTile(post);
      router.push(`/(customer)/discover/snaps/detail/${post.id}` as Href);
    },
    [onPressTile, router],
  );

  const renderItem: ListRenderItem<SnapPost> = useCallback(
    ({ item }) => {
      const engagement = item.likes + item.saves;
      return (
        <Pressable
          onPress={() => handlePress(item)}
          onLongPress={onLongPressTile ? () => onLongPressTile(item) : undefined}
          style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}
        >
          <Image source={{ uri: item.image }} style={styles.tileImage} />
          {engagement > 0 ? (
            <View style={styles.badge}>
              <Ionicons name="heart" size={10} color="#fff" />
              <Text style={styles.badgeText}>{engagement}</Text>
            </View>
          ) : null}
        </Pressable>
      );
    },
    [handlePress, onLongPressTile],
  );

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      numColumns={3}
      ListHeaderComponent={ListHeaderComponent}
      scrollEnabled={scrollEnabled}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={contentContainerStyle}
      columnWrapperStyle={styles.row}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        </View>
      }
    />
  );
}
