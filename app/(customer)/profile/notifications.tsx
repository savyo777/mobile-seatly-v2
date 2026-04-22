import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { ToggleRow } from '@/components/profile/ToggleRow';
import { mockNotificationPrefs } from '@/lib/mock/profileScreens';
import { useColors, createStyles, spacing, typography, shadows } from '@/lib/theme';

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
    mockNotificationPrefs.forEach((p) => {
      o[p.id] = p.defaultOn;
    });
    return o;
  }, []);
  const [prefs, setPrefs] = useState(initial);

  const update = (id: string, v: boolean) => {
    setPrefs((prev) => ({ ...prev, [id]: v }));
  };

  return (
    <ProfileStackScreen title={t('profile.notifications')} subtitle={t('profile.notificationsSub')}>
      <Text style={styles.intro}>
        Choose what you want to hear about. You can change these anytime — we will never spam you.
      </Text>
      <View style={styles.group}>
        {mockNotificationPrefs.map((p, i) => (
          <ToggleRow
            key={p.id}
            title={p.title}
            subtitle={p.subtitle}
            value={prefs[p.id] ?? false}
            onValueChange={(v) => update(p.id, v)}
            isLast={i === mockNotificationPrefs.length - 1}
          />
        ))}
      </View>
    </ProfileStackScreen>
  );
}
