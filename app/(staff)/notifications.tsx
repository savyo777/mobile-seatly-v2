import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ListRenderItem } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ui';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { useColors, createStyles, spacing, borderRadius, typography } from '@/lib/theme';
import { mockStaffNotifications, type AppNotification } from '@/lib/mock/notifications';

function iconForType(type: AppNotification['type']): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'no_show_flag':
      return 'alert-circle';
    case 'booking_confirmed':
    case 'booking_reminder_24h':
    case 'booking_reminder_2h':
    case 'booking_cancelled':
    case 'waitlist_ready':
      return 'calendar';
    case 'payment_received':
      return 'cash';
    case 'shift_reminder':
      return 'time';
    case 'loyalty_milestone':
      return 'star';
    default:
      return 'notifications';
  }
}

// Plain relative-time formatter. We previously used Intl.RelativeTimeFormat,
// but that API is missing on some React Native Hermes builds and threw at
// render time, breaking the whole notifications screen.
function timeAgo(iso: string, locale: string): string {
  const fr = locale === 'fr';
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return '';
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));

  if (sec < 60) return fr ? "à l'instant" : 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) {
    if (fr) return `il y a ${min} min`;
    return `${min} min ago`;
  }
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    if (fr) return `il y a ${hr} h`;
    return `${hr}h ago`;
  }
  const day = Math.floor(hr / 24);
  if (day < 7) {
    if (fr) return `il y a ${day} j`;
    return `${day}d ago`;
  }
  const week = Math.floor(day / 7);
  if (week < 5) {
    if (fr) return `il y a ${week} sem`;
    return `${week}w ago`;
  }
  return new Date(ts).toLocaleDateString(fr ? 'fr-FR' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

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
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set(mockStaffNotifications.filter((n) => n.isRead).map((n) => n.id)));

  const onPress = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const renderItem: ListRenderItem<AppNotification> = ({ item }) => {
    const isUnread = !readIds.has(item.id);
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => onPress(item.id)}>
        <View style={[styles.item, isUnread && styles.itemUnread]}>
          <View style={styles.iconWrap}>
            <Ionicons name={iconForType(item.type)} size={22} color={isUnread ? c.gold : c.textMuted} />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.time}>{timeAgo(item.createdAt, i18n.language)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper scrollable={false} padded>
      <SubpageHeader title={t('staff.notifications')} fallbackTab="more" />
      <FlatList
        data={mockStaffNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </ScreenWrapper>
  );
}
