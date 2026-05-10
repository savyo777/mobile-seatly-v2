import React, { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { ToggleRow } from '@/components/profile/ToggleRow';
import { mockNotificationPrefs as DEMO_NOTIFICATION_PREFS } from '@/lib/mock/profileScreens';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import {
  fetchUserProfileNotificationPrefs,
  updateCurrentUserProfile,
} from '@/lib/services/userProfile';
import { useColors, createStyles, spacing, typography, shadows } from '@/lib/theme';

// Static catalog of notification rows (labels are UI strings, not data).
// In production we use the same catalog and persist toggle state to Supabase.
const NOTIFICATION_PREFS = DEMO_NOTIFICATION_PREFS;

const useStyles = createStyles((c) => ({
  intro: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
    opacity: 0.95,
  },
  group: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...shadows.card,
  },
}));

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const styles = useStyles();
  const initial = useMemo(() => {
    const o: Record<string, boolean> = {};
    NOTIFICATION_PREFS.forEach((p) => {
      o[p.id] = p.defaultOn;
    });
    return o;
  }, []);
  const [prefs, setPrefs] = useState(initial);

  useEffect(() => {
    if (isDemoModeEnabled()) return;
    let active = true;
    void fetchUserProfileNotificationPrefs()
      .then((remote) => {
        if (!active) return;
        if (Object.keys(remote).length === 0) return;
        setPrefs((prev) => ({ ...prev, ...remote }));
      })
      .catch(() => {
        // Keep defaults on error.
      });
    return () => {
      active = false;
    };
  }, []);

  const update = (id: string, v: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [id]: v };
      if (!isDemoModeEnabled()) {
        void updateCurrentUserProfile({ notification_preferences_json: next });
      }
      return next;
    });
  };

  return (
    <ProfileStackScreen title={t('profile.notifications')} subtitle={t('profile.notificationsSub')}>
      <Text style={styles.intro}>
        Choose what you want to hear about. You can change these anytime — we will never spam you.
      </Text>
      <View style={styles.group}>
        {NOTIFICATION_PREFS.map((p, i) => (
          <ToggleRow
            key={p.id}
            title={p.title}
            subtitle={p.subtitle}
            value={prefs[p.id] ?? false}
            onValueChange={(v) => update(p.id, v)}
            isLast={i === NOTIFICATION_PREFS.length - 1}
          />
        ))}
      </View>
    </ProfileStackScreen>
  );
}
