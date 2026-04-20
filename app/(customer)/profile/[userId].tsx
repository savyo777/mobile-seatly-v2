import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams, Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getSnapUser, listSnapPostsByUser, type SnapPost } from '@/lib/mock/snaps';
import {
  isFollowing,
  follow,
  unfollow,
  getFollowerCount,
  getFollowingCount,
} from '@/lib/mock/social';
import { mockCustomer } from '@/lib/mock/users';
import { colors, spacing, typography } from '@/lib/theme';

const SCREEN_W = Dimensions.get('window').width;
const GAP = 1.5;
const THUMB = (SCREEN_W - GAP * 2) / 3;
const ME = mockCustomer.id;

export default function PublicProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const user = getSnapUser(userId ?? '');
  const posts = listSnapPostsByUser(userId ?? '');

  const [following, setFollowing] = useState(() => isFollowing(ME, userId ?? ''));
  const [followerCount, setFollowerCount] = useState(() => getFollowerCount(userId ?? ''));

  const handleFollow = () => {
    if (following) {
      unfollow(ME, userId ?? '');
      setFollowerCount((c) => c - 1);
    } else {
      follow(ME, userId ?? '');
      setFollowerCount((c) => c + 1);
    }
    setFollowing((f) => !f);
  };

  const renderThumbnail = ({ item, index }: { item: SnapPost; index: number }) => {
    const col = index % 3;
    return (
      <Pressable
        onPress={() => router.push(`/(customer)/discover/snaps/detail/${item.id}` as Href)}
        style={[styles.thumb, col === 1 && { marginHorizontal: GAP }]}
      >
        <Image source={{ uri: item.image }} style={styles.thumbImg} />
      </Pressable>
    );
  };

  const Header = useCallback(
    () => (
      <View>
        {/* Top nav */}
        <View style={[styles.topNav, { paddingTop: insets.top + 4 }]}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.navUsername}>{user?.username ?? userId}</Text>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textPrimary} />
        </View>

        {/* Avatar row */}
        <View style={styles.heroRow}>
          <View style={styles.avatarWrap}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={38} color={colors.textMuted} />
              </View>
            )}
          </View>
          <View style={styles.statsRow}>
            <StatBlock value={posts.length} label="Posts" />
            <StatBlock value={followerCount} label="Followers" />
            <StatBlock value={getFollowingCount(userId ?? '')} label="Following" />
          </View>
        </View>

        {/* Username */}
        <Text style={styles.displayName}>@{user?.username ?? userId}</Text>

        {/* Action buttons */}
        <View style={styles.actionBtns}>
          <Pressable
            onPress={handleFollow}
            style={({ pressed }) => [
              styles.followBtn,
              following && styles.followBtnSecondary,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text style={[styles.followBtnText, following && styles.followBtnTextSecondary]}>
              {following ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.messageBtn, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.messageBtnText}>Message</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.chevronBtn, pressed && { opacity: 0.75 }]}>
            <Ionicons name="chevron-down" size={16} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Tab divider */}
        <View style={styles.tabDivider} />
      </View>
    ),
    [following, followerCount, insets.top, posts.length, userId, user],
  );

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.lg }} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>User not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        numColumns={3}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={Header}
        renderItem={renderThumbnail}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No posts yet</Text>
          </View>
        }
      />
    </View>
  );
}

function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  navUsername: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xl,
  },
  avatarWrap: {
    padding: 2,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.gold,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: colors.bgElevated,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBlock: {
    alignItems: 'center',
    gap: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  statLabel: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  displayName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  actionBtns: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  followBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.gold,
    alignItems: 'center',
  },
  followBtnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  followBtnText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.bgBase,
  },
  followBtnTextSecondary: {
    color: colors.textPrimary,
  },
  messageBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  messageBtnText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  chevronBtn: {
    width: 36,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tabDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.bgElevated,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing['4xl'],
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
