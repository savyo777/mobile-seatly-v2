import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Href, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  bucketNotifications,
  getNotificationActor,
  listNotifications,
  markAllRead,
  type SocialNotification,
  type NotificationBucket,
} from '@/lib/mock/notifications';
import { getSnapPostById, timeAgoLabel } from '@/lib/mock/snaps';
import { follow, isFollowing, unfollow } from '@/lib/mock/social';
import { mockCustomer } from '@/lib/mock/users';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';

const ME = mockCustomer.id;

const BUCKET_ORDER: NotificationBucket[] = ['today', 'thisWeek', 'earlier'];

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [items, setItems] = useState<SocialNotification[]>(() => listNotifications(ME));
  const [followState, setFollowState] = useState<Record<string, boolean>>(() => {
    const seed: Record<string, boolean> = {};
    items.forEach((n) => {
      if (n.type === 'follow') seed[n.actorId] = isFollowing(ME, n.actorId);
    });
    return seed;
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      markAllRead(ME);
      setItems(listNotifications(ME));
    }, 400);
    return () => clearTimeout(timeout);
  }, []);

  const handleFollowToggle = useCallback((actorId: string) => {
    const currently = isFollowing(ME, actorId);
    if (currently) unfollow(ME, actorId);
    else follow(ME, actorId);
    setFollowState((prev) => ({ ...prev, [actorId]: !currently }));
  }, []);

  const buckets = bucketNotifications(items);

  const renderNotification = (n: SocialNotification) => {
    const actor = getNotificationActor(n.actorId);
    const post = n.postId ? getSnapPostById(n.postId) : undefined;

    const handlePress = () => {
      if (n.type === 'follow') {
        router.push(`/(customer)/profile/${n.actorId}` as Href);
      } else if (post) {
        router.push(`/(customer)/discover/snaps/detail/${post.id}` as Href);
      }
    };

    let text: React.ReactNode;
    if (n.type === 'like') {
      text = (
        <Text style={styles.text}>
          <Text style={styles.username}>{actor?.username ?? 'someone'}</Text>{' '}
          {t('notifications.liked')}
        </Text>
      );
    } else if (n.type === 'comment') {
      text = (
        <Text style={styles.text}>
          <Text style={styles.username}>{actor?.username ?? 'someone'}</Text>{' '}
          {t('notifications.commented')}
          {n.commentText ? <Text style={styles.quoted}> "{n.commentText}"</Text> : null}
        </Text>
      );
    } else {
      text = (
        <Text style={styles.text}>
          <Text style={styles.username}>{actor?.username ?? 'someone'}</Text>{' '}
          {t('notifications.followed')}
        </Text>
      );
    }

    const following = followState[n.actorId] ?? isFollowing(ME, n.actorId);

    return (
      <Pressable
        key={n.id}
        onPress={handlePress}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
      >
        {actor?.avatarUrl ? (
          <Image source={{ uri: actor.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]} />
        )}
        <View style={styles.body}>
          {text}
          <Text style={styles.time}>{timeAgoLabel(n.timestamp)}</Text>
        </View>
        {n.type === 'follow' ? (
          <Pressable
            onPress={() => handleFollowToggle(n.actorId)}
            style={[styles.followBtn, following && styles.followBtnActive]}
          >
            <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
              {following ? t('notifications.following') : t('notifications.followBack')}
            </Text>
          </Pressable>
        ) : post ? (
          <Image source={{ uri: post.image }} style={styles.thumb} />
        ) : null}
      </Pressable>
    );
  };

  const bucketLabel = (key: NotificationBucket) => {
    if (key === 'today') return t('notifications.today');
    if (key === 'thisWeek') return t('notifications.thisWeek');
    return t('notifications.earlier');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>{t('notifications.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>{t('notifications.empty')}</Text>
          </View>
        ) : (
          BUCKET_ORDER.map((bucket) => {
            const list = buckets[bucket];
            if (!list.length) return null;
            return (
              <View key={bucket}>
                <Text style={styles.bucketHeader}>{bucketLabel(bucket)}</Text>
                {list.map(renderNotification)}
              </View>
            );
          })
        )}
      </ScrollView>
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
  bucketHeader: {
    ...typography.label,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bgElevated,
  },
  avatarFallback: {
    backgroundColor: colors.bgElevated,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  text: {
    ...typography.body,
    color: colors.textPrimary,
  },
  username: {
    fontWeight: '700',
  },
  quoted: {
    color: colors.textSecondary,
  },
  time: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontSize: 11,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgElevated,
  },
  followBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gold,
  },
  followBtnActive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  followBtnText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.bgBase,
  },
  followBtnTextActive: {
    color: colors.textPrimary,
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
