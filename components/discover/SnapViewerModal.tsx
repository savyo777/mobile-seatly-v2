import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';
import type { SnapPost } from '@/lib/mock/snaps';
import { getSnapUser, getSnapRestaurantName, timeAgoLabel } from '@/lib/mock/snaps';

type SnapViewerModalProps = {
  visible: boolean;
  post: SnapPost | null;
  onClose: () => void;
};

export function SnapViewerModal({ visible, post, onClose }: SnapViewerModalProps) {
  const user = post ? getSnapUser(post.user_id) : undefined;
  const restaurantName = post ? getSnapRestaurantName(post.restaurant_id) : '';
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          {post ? <Image source={{ uri: post.image }} style={styles.image} /> : null}
          <View style={styles.body}>
            <View style={styles.row}>
              {user?.avatarUrl ? <Image source={{ uri: user.avatarUrl }} style={styles.avatar} /> : <View style={styles.avatar} />}
              <View style={styles.meta}>
                <Text style={styles.username}>@{user?.username ?? 'guest'}</Text>
                <Text style={styles.time}>
                  {post ? timeAgoLabel(post.timestamp) : ''} · {restaurantName}
                </Text>
              </View>
            </View>
            <Text style={styles.caption}>{post?.caption}</Text>
          </View>
          <Pressable style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 440,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.35)',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.bgElevated,
  },
  body: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bgElevated,
  },
  meta: {
    flex: 1,
  },
  username: {
    ...typography.bodySmall,
    color: colors.goldLight,
    fontWeight: '700',
  },
  time: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  caption: {
    ...typography.body,
    color: colors.textPrimary,
  },
  close: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  closeText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '700',
  },
});
