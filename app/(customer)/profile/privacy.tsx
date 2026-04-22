import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { ProfileSectionTitle } from '@/components/profile/ProfileSectionTitle';
import { ChevronSettingRow } from '@/components/profile/ChevronSettingRow';
import { ToggleRow } from '@/components/profile/ToggleRow';
import { useColors, createStyles, spacing, borderRadius, shadows } from '@/lib/theme';

const useStyles = createStyles((c) => ({
  group: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...shadows.card,
  },
}));

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();

  const [adPersonalization, setAdPersonalization] = useState(true);
  const [analytics, setAnalytics] = useState(true);
  const [recommendations, setRecommendations] = useState(true);

  const confirmDelete = () => {
    Alert.alert(
      'Delete account',
      'This will permanently remove your Seatly account and reservation history. This cannot be undone.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {} },
      ],
    );
  };

  return (
    <ProfileStackScreen
      title={t('profile.privacySecurity')}
      subtitle="Control how Seatly uses your data and manage your account data."
    >
      <ProfileSectionTitle>Data preferences</ProfileSectionTitle>
      <View style={styles.group}>
        <ToggleRow
          title="Personalised recommendations"
          subtitle="Let Seatly use your dining history to suggest restaurants and events"
          value={recommendations}
          onValueChange={setRecommendations}
        />
        <ToggleRow
          title="Ad personalisation"
          subtitle="Allow personalised promotions and offers based on your activity"
          value={adPersonalization}
          onValueChange={setAdPersonalization}
        />
        <ToggleRow
          title="Analytics & crash reporting"
          subtitle="Help improve Seatly by sharing anonymous usage data"
          value={analytics}
          onValueChange={setAnalytics}
          isLast
        />
      </View>

      <ProfileSectionTitle>Your data</ProfileSectionTitle>
      <View style={styles.group}>
        <ChevronSettingRow
          title="Download account data"
          subtitle="Get a copy of your reservations, orders, and profile"
          icon="download-outline"
          onPress={() => Alert.alert('Download data', 'We will email a link when your export is ready (demo).')}
        />
        <ChevronSettingRow
          title="Delete account"
          subtitle="Permanently remove your account and data"
          icon="trash-outline"
          destructive
          isLast
          onPress={confirmDelete}
        />
      </View>
    </ProfileStackScreen>
  );
}
