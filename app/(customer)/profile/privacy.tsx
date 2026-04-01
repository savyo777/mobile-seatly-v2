import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { ProfileSectionTitle } from '@/components/profile/ProfileSectionTitle';
import { ChevronSettingRow } from '@/components/profile/ChevronSettingRow';
import { ToggleRow } from '@/components/profile/ToggleRow';
import { colors, spacing, borderRadius, shadows } from '@/lib/theme';

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const [faceId, setFaceId] = useState(true);
  const [twoFa, setTwoFa] = useState(false);

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
    <ProfileStackScreen title={t('profile.privacySecurity')} subtitle={t('profile.privacyHubSubtitle')}>
      <ProfileSectionTitle>Sign-in & security</ProfileSectionTitle>
      <View style={styles.group}>
        <ChevronSettingRow
          title="Change password"
          subtitle="Update your Seatly password"
          icon="key-outline"
          onPress={() => Alert.alert('Change password', 'You will receive an email to reset your password (demo).')}
        />
        <ToggleRow
          title="Face ID / biometric login"
          subtitle="Use Face ID or fingerprint to unlock Seatly"
          value={faceId}
          onValueChange={setFaceId}
        />
        <ToggleRow
          title="Two-factor authentication"
          subtitle="Require a code from your authenticator app when signing in"
          value={twoFa}
          onValueChange={setTwoFa}
        />
        <ChevronSettingRow
          title="Manage connected devices"
          subtitle="See where you are signed in"
          icon="phone-portrait-outline"
          isLast
          onPress={() =>
            Alert.alert(
              'Connected devices',
              'iPhone 15 Pro · Toronto\nLast active: Today\n\nSafari · Web\nLast active: Mar 10, 2026',
            )
          }
        />
      </View>

      <ProfileSectionTitle>Data & privacy</ProfileSectionTitle>
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

const styles = StyleSheet.create({
  group: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...shadows.card,
  },
});
