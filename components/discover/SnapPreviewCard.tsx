import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { borderRadius, createStyles, shadows, spacing, typography, useColors } from '@/lib/theme';
import type { SnapPost, SnapUser } from '@/lib/mock/snaps';
import { timeAgoLabel } from '@/lib/mock/snaps';

type SnapPreviewCardProps = {
  post: SnapPost;
  user?: SnapUser;
  onPress: () => void;
  compact?: boolean;
};

const useStyles = createStyles((c) => ({
  card: {
    width: 270,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.32)',
    ...shadows.card,
  },
  compactCard: {
    width: '100%',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  imageWrap: {
    height: 180,
    backgroundColor: c.bgElevated,
    position: 'relative',
  },
  imageLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  body: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  username: {
    ...typography.bodySmall,
    color: c.goldLight,
    fontWeight: '700',
  },
  time: {
    ...typography.bodySmall,
    color: c.textMuted,
  },
  caption: {
    ...typography.body,
    color: c.textPrimary,
    minHeight: 40,
  },
  tagRow: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  tag: {
    ...typography.bodySmall,
    color: c.goldLight,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.45)',
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
}));

export function SnapPreviewCard({ post, user, onPress, compact = false }: SnapPreviewCardProps) {
  const c = useColors();
  const styles = useStyles();
  const [loadingImage, setLoadingImage] = useState(true);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, compact && styles.compactCard, pressed && styles.pressed]}>
      <View style={styles.imageWrap}>
        {loadingImage ? (
          <View style={styles.imageLoader}>
            <ActivityIndicator color={c.gold} size="small" />
          </View>
        ) : null}
        <Image source={{ uri: post.image }} style={styles.image} onLoadEnd={() => setLoadingImage(false)} />
      </View>
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Text style={styles.username}>@{user?.username ?? 'guest'}</Text>
          <Text style={styles.time}>{timeAgoLabel(post.timestamp)}</Text>
        </View>
        <Text style={styles.caption} numberOfLines={compact ? 2 : 3}>
          {post.caption}
        </Text>
        <View style={styles.tagRow}>
          <Text style={styles.tag}>Verified diner</Text>
        </View>
      </View>
    </Pressable>
  );
}
