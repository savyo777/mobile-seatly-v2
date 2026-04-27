import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { useColors, createStyles, spacing, borderRadius, typography, shadows } from '@/lib/theme';
import { revokeSession, revokeAllOtherSessions } from '@/lib/services/accountSecurity';
import { useAuthSession } from '@/lib/auth/AuthContext';

type Session = {
  id: string;
  device: string;
  platform: 'ios' | 'android' | 'web';
  location: string;
  lastActiveAt: string;
  isCurrent: boolean;
};

const useStyles = createStyles((c) => ({
  sessionCard: {
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    ...shadows.card,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  device: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '600',
  },
  currentBadge: {
    backgroundColor: `${c.gold}20`,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: `${c.gold}50`,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.gold,
  },
  meta: {
    ...typography.bodySmall,
    color: c.textMuted,
  },
  revokeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: `${c.danger}40`,
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  revokeBtnText: {
    ...typography.bodySmall,
    color: c.danger,
    fontWeight: '600',
  },
  revokeAllBtn: {
    marginTop: spacing.xl,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${c.danger}25`,
    backgroundColor: `${c.danger}08`,
    alignItems: 'center',
  },
  revokeAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.danger,
  },
}));

function platformIcon(platform: Session['platform']): React.ComponentProps<typeof Ionicons>['name'] {
  if (platform === 'ios') return 'phone-portrait-outline';
  if (platform === 'android') return 'logo-android';
  return 'globe-outline';
}

function formatLastActive(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 2) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function SessionsScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const { session } = useAuthSession();
  const initialSessions: Session[] = session
    ? [
        {
          id: session.access_token.slice(0, 16),
          device: 'This device',
          platform: Platform.OS === 'android' ? 'android' : Platform.OS === 'web' ? 'web' : 'ios',
          location: 'Current session',
          lastActiveAt: session.user.last_sign_in_at ?? new Date().toISOString(),
          isCurrent: true,
        },
      ]
    : [];
  const [sessions, setSessions] = useState(initialSessions);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const handleRevoke = (session: Session) => {
    if (session.isCurrent) return;
    Alert.alert(
      t('profile.signOutDevice'),
      `Sign out of ${session.device}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            setRevoking(session.id);
            try {
              await revokeSession(session.id);
              setSessions((prev) => prev.filter((s) => s.id !== session.id));
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setRevoking(null);
            }
          },
        },
      ],
    );
  };

  const handleRevokeAll = () => {
    Alert.alert(
      t('profile.signOutAllOthers'),
      'This will sign you out of all other devices.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Sign out all',
          style: 'destructive',
          onPress: async () => {
            setRevokingAll(true);
            try {
              await revokeAllOtherSessions();
              setSessions((prev) => prev.filter((s) => s.isCurrent));
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setRevokingAll(false);
            }
          },
        },
      ],
    );
  };

  const others = sessions.filter((s) => !s.isCurrent);

  return (
    <ProfileStackScreen
      title={t('profile.activeSessions')}
      subtitle={t('profile.activeSessionsSub')}
    >
      {sessions.map((session) => (
        <View key={session.id} style={styles.sessionCard}>
          <View style={styles.iconWrap}>
            <Ionicons name={platformIcon(session.platform)} size={20} color={c.textSecondary} />
          </View>
          <View style={styles.info}>
            <View style={styles.deviceRow}>
              <Text style={styles.device}>{session.device}</Text>
              {session.isCurrent && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>{t('profile.currentDevice')}</Text>
                </View>
              )}
            </View>
            <Text style={styles.meta}>{session.location}</Text>
            <Text style={styles.meta}>
              {t('profile.lastActive')}: {formatLastActive(session.lastActiveAt)}
            </Text>
            {!session.isCurrent && (
              <Pressable
                onPress={() => handleRevoke(session)}
                style={styles.revokeBtn}
                disabled={revoking === session.id}
              >
                {revoking === session.id
                  ? <ActivityIndicator size="small" color={c.danger} />
                  : <Text style={styles.revokeBtnText}>{t('profile.signOutDevice')}</Text>
                }
              </Pressable>
            )}
          </View>
        </View>
      ))}
      {others.length > 0 && (
        <Pressable
          onPress={handleRevokeAll}
          style={styles.revokeAllBtn}
          disabled={revokingAll}
        >
          {revokingAll
            ? <ActivityIndicator color={c.danger} />
            : <Text style={styles.revokeAllText}>{t('profile.signOutAllOthers')}</Text>
          }
        </Pressable>
      )}
    </ProfileStackScreen>
  );
}
