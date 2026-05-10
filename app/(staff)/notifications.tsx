import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ListRenderItem } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ui';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { useColors, createStyles, spacing, borderRadius, typography } from '@/lib/theme';
import { mockStaffNotifications as DEMO_STAFF_NOTIFICATIONS } from '@/lib/mock/notifications';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { fetchCurrentUserProfile } from '@/lib/services/userProfile';
import { getSupabase } from '@/lib/supabase/client';
import { subscribeToNotifications } from '@/lib/realtime/notificationsRegistry';
import {
  getStaffNotificationIconName,
  getStaffNotificationTimeLabel,
  normalizeStaffNotifications,
  type NormalizedStaffNotification,
} from '@/lib/notifications/staffNotifications';

const initialStaffNotifications: typeof DEMO_STAFF_NOTIFICATIONS = isDemoModeEnabled()
  ? DEMO_STAFF_NOTIFICATIONS
  : [];

type NotificationRow = {
  id: string;
  type: string | null;
  title: string | null;
  body: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

function mapNotificationRow(row: NotificationRow): (typeof DEMO_STAFF_NOTIFICATIONS)[number] {
  return {
    id: row.id,
    type: (row.type ?? 'unknown') as (typeof DEMO_STAFF_NOTIFICATIONS)[number]['type'],
    title: row.title ?? 'Notification',
    body: row.body ?? '',
    isRead: row.is_read === true,
    createdAt: row.created_at ?? '',
  };
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const useStyles = createStyles((c) => ({
  list: {
    paddingBottom: spacing['4xl'],
  },
  item: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    marginBottom: spacing.md,
  },
  itemUnread: {
    borderLeftWidth: 4,
    borderLeftColor: c.gold,
  },
  iconWrap: {
    marginRight: spacing.md,
    paddingTop: 2,
  },
  textCol: {
    flex: 1,
  },
  title: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: spacing.xs,
  },
  body: {
    ...typography.body,
    color: c.textSecondary,
  },
  time: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: spacing.sm,
  },
}));

export default function StaffNotificationsScreen() {
  const { t, i18n } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const [rawNotifications, setRawNotifications] = useState<typeof DEMO_STAFF_NOTIFICATIONS>(
    initialStaffNotifications,
  );
  const notifications = useMemo(
    () => normalizeStaffNotifications(rawNotifications),
    [rawNotifications],
  );
  const [readIds, setReadIds] = useState<Set<string>>(
    () => new Set(notifications.filter((n) => n.isRead).map((n) => n.id)),
  );

  useEffect(() => {
    if (isDemoModeEnabled()) return;
    let active = true;
    let unsubscribe: (() => void) | null = null;

    const reload = async (userProfileId: string) => {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data } = await supabase
        .from('notifications')
        .select('id,type,title,body,is_read,created_at')
        .eq('user_id', userProfileId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!active) return;
      const rows = ((data ?? []) as NotificationRow[]).map(mapNotificationRow);
      setRawNotifications(rows);
      setReadIds(new Set(rows.filter((n) => n.isRead).map((n) => n.id)));
    };

    void (async () => {
      const profile = await fetchCurrentUserProfile().catch(() => null);
      const userProfileId = profile?.id ?? null;
      if (!userProfileId || !active) return;
      await reload(userProfileId);
      unsubscribe = subscribeToNotifications(userProfileId, () => {
        void reload(userProfileId);
      });
    })();

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const onPress = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const renderItem: ListRenderItem<NormalizedStaffNotification> = ({ item }) => {
    const isUnread = !readIds.has(item.id);
    const iconName = getStaffNotificationIconName(item.type) as IoniconName;
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => onPress(item.id)}>
        <View style={[styles.item, isUnread && styles.itemUnread]}>
          <View style={styles.iconWrap}>
            <Ionicons name={iconName} size={22} color={isUnread ? c.gold : c.textMuted} />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.time}>
              {getStaffNotificationTimeLabel(item.createdAt, i18n.language)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper scrollable={false} padded>
      <SubpageHeader title={t('staff.notifications')} fallbackTab="more" />
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </ScreenWrapper>
  );
}
