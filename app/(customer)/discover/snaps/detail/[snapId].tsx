import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ui';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';
import { getSnapPostById, getSnapRestaurantName, getSnapUser, timeAgoLabel } from '@/lib/mock/snaps';

export default function SnapDetailScreen() {
  const router = useRouter();
  const { snapId, restaurantId } = useLocalSearchParams<{ snapId: string; restaurantId?: string }>();
  const post = getSnapPostById(snapId);
  const user = post ? getSnapUser(post.user_id) : undefined;
  const restaurantName = getSnapRestaurantName(restaurantId ?? post?.restaurant_id ?? '');

  if (!post) {
    return (
      <ScreenWrapper>
        <View style={styles.centered}>
          <Text style={styles.empty}>Snap not found</Text>
          <Pressable onPress={() => router.back()} style={styles.backGhost}>
            <Text style={styles.backGhostText}>Go back</Text>
          </Pressable>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <View style={styles.root}>
        <Image source={{ uri: post.image }} style={styles.image} />
        <Pressable onPress={() => router.back()} style={styles.close}>
          <Ionicons name="close" size={18} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.overlay}>
          <View style={styles.userRow}>
            {user?.avatarUrl ? <Image source={{ uri: user.avatarUrl }} style={styles.avatar} /> : <View style={styles.avatar} />}
            <View style={styles.userMeta}>
              <Text style={styles.username}>@{user?.username ?? 'guest'}</Text>
              <Text style={styles.time}>
                {timeAgoLabel(post.timestamp)} · {restaurantName}
              </Text>
            </View>
          </View>
          <Text style={styles.caption}>{post.caption}</Text>
          <View style={styles.actionRow}>
            <Pressable style={styles.iconBtn}>
              <Ionicons name="heart-outline" size={17} color={colors.textPrimary} />
            </Pressable>
            <Pressable style={styles.iconBtn}>
              <Ionicons name="bookmark-outline" size={17} color={colors.textPrimary} />
            </Pressable>
            <Pressable style={styles.iconBtn}>
              <Ionicons name="share-social-outline" size={17} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    backgroundColor: colors.bgElevated,
  },
  close: {
    position: 'absolute',
    top: spacing['3xl'],
    right: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    marginTop: 'auto',
    backgroundColor: 'rgba(10,10,10,0.78)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(201, 168, 76, 0.3)',
    padding: spacing.lg,
    gap: spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bgElevated,
  },
  userMeta: {
    flex: 1,
  },
  username: {
    ...typography.body,
    color: colors.goldLight,
    fontWeight: '700',
  },
  time: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  caption: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  empty: {
    ...typography.h3,
    color: colors.textSecondary,
  },
  backGhost: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  backGhostText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
});
