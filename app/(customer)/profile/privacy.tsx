import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { ProfileSectionTitle } from '@/components/profile/ProfileSectionTitle';
import { ChevronSettingRow } from '@/components/profile/ChevronSettingRow';
import { ToggleRow } from '@/components/profile/ToggleRow';
import { createStyles, spacing, borderRadius, shadows, useColors } from '@/lib/theme';
import { requestMyDataExport } from '@/lib/privacy/dataExport';
import { friendlyError } from '@/lib/errors/friendlyError';
import { getAnalyticsOptIn, setAnalyticsOptIn } from '@/lib/analytics/privacyPrefs';
import { setPosthogEnabled } from '@/lib/analytics/posthog';
import { DeleteAccountDialog } from '@/components/account/DeleteAccountDialog';

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
  const router = useRouter();
  const styles = useStyles();

  const [adPersonalization, setAdPersonalization] = useState(true);
  const [analytics, setAnalytics] = useState(true);
  const [recommendations, setRecommendations] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Build 3e — hydrate the persisted analytics-opt-in preference on mount,
  // then keep PostHog SDK in sync whenever the user flips the toggle.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const optedIn = await getAnalyticsOptIn();
      if (!cancelled) setAnalytics(optedIn);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAnalyticsToggle = (next: boolean) => {
    setAnalytics(next);
    setPosthogEnabled(next);
    void setAnalyticsOptIn(next);
  };

  const handleDownloadData = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await requestMyDataExport();
      if (result.delivered_to === 'email') {
        Alert.alert(
          'Export ready',
          `We've emailed you a download link. It expires in 24 hours.`,
        );
      } else {
        Alert.alert(
          'Export ready',
          `Your data export is ready. Tap OK to open the download link (valid 24h).`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'OK',
              onPress: () => {
                if (result.download_url) {
                  // Best effort; the share-sheet route below handles missing Linking gracefully.
                  void import('react-native').then(({ Linking }) => {
                    void Linking.openURL(result.download_url!);
                  });
                }
              },
            },
          ],
        );
      }
    } catch (err) {
      Alert.alert(
        'Could not start export',
        friendlyError(
          err,
          'Your data export could not be started. Please try again in a few minutes.',
        ),
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <ProfileStackScreen
      title={t('profile.privacySecurity')}
      subtitle="Control how Cenaiva uses your data and manage your account data."
    >
      <ProfileSectionTitle>Data preferences</ProfileSectionTitle>
      <View style={styles.group}>
        <ToggleRow
          title="Personalised recommendations"
          subtitle="Let Cenaiva use your dining history to suggest restaurants and events"
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
          subtitle="Help improve Cenaiva by sharing anonymous usage data"
          value={analytics}
          onValueChange={handleAnalyticsToggle}
          isLast
        />
      </View>

      <ProfileSectionTitle>Your data</ProfileSectionTitle>
      <View style={styles.group}>
        <ChevronSettingRow
          title="What restaurants see about me"
          subtitle="View your auto-tags, lifetime value, and no-show risk"
          icon="eye-outline"
          onPress={() => router.push('/(customer)/profile/my-profile-data')}
        />
        <ChevronSettingRow
          title="Download account data"
          subtitle={exporting ? 'Preparing your export…' : 'Get a copy of your reservations, photos, and profile'}
          icon="download-outline"
          isLast
          onPress={handleDownloadData}
        />
      </View>

      <ProfileSectionTitle>Delete account</ProfileSectionTitle>
      <View style={styles.group}>
        {/* Per Terms §3 and Privacy §11: deletion path MUST be
            Profile → Privacy → Delete Account. Mirrors the existing
            implementation in Profile → Settings → Delete account so
            both entry points use the same confirm + Supabase call. */}
        <ChevronSettingRow
          title="Delete account"
          subtitle="Permanently remove your account, bookings, and personal data. This cannot be undone."
          icon="trash-outline"
          isLast
          onPress={handleDeleteAccount}
        />
      </View>
      <DeleteAccountDialog
        visible={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onDeleted={() => router.replace('/onboarding' as never)}
      />
    </ProfileStackScreen>
  );

  function handleDeleteAccount() {
    setShowDeleteDialog(true);
  }
}
