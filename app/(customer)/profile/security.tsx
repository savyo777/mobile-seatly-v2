import React, { useState } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { ProfileSectionTitle } from '@/components/profile/ProfileSectionTitle';
import { ChevronSettingRow } from '@/components/profile/ChevronSettingRow';
import { ToggleRow } from '@/components/profile/ToggleRow';
import { useColors, createStyles, spacing, borderRadius, shadows } from '@/lib/theme';
import { sendPasswordResetEmail, toggleTwoFactor, toggleBiometric } from '@/lib/services/accountSecurity';
import { resolveDisplayPhone } from '@/lib/services/phoneAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { friendlyError } from '@/lib/errors/friendlyError';
import { key as storageKey } from '@/lib/storage/keys';

const BIOMETRIC_KEY = storageKey('biometric');
const TWO_FA_KEY = storageKey('twofactor');

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

export default function SecurityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const styles = useStyles();
  const { user } = useAuthSession();
  const currentEmail = user?.email ?? '';
  const currentPhone = resolveDisplayPhone(user);

  const [biometric, setBiometric] = useState(false);
  const [twoFa, setTwoFa] = useState(false);

  const handleResetPassword = () => {
    Alert.alert(
      t('profile.resetPassword'),
      `${t('profile.resetPasswordSub')}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Send link',
          onPress: async () => {
            try {
              if (!currentEmail) {
                Alert.alert('Error', friendlyError(undefined, 'No account email is available for password reset.'));
                return;
              }
              await sendPasswordResetEmail(currentEmail);
              Alert.alert(
                'Email sent',
                t('profile.resetPasswordSent', { email: currentEmail }),
              );
            } catch (e: any) {
              Alert.alert('Error', friendlyError(e, 'Could not send the reset email. Please try again.'));
            }
          },
        },
      ],
    );
  };

  const handleBiometricToggle = async (v: boolean) => {
    setBiometric(v);
    await AsyncStorage.setItem(BIOMETRIC_KEY, String(v));
    await toggleBiometric(v);
  };

  const handleTwoFaToggle = async (v: boolean) => {
    setTwoFa(v);
    await AsyncStorage.setItem(TWO_FA_KEY, String(v));
    if (v) {
      Alert.alert(
        'Two-factor authentication',
        'In the full app, you will scan a QR code with your authenticator. For now it\'s enabled in demo mode.',
      );
    }
    await toggleTwoFactor(v);
  };

  return (
    <ProfileStackScreen
      title={t('profile.security')}
      subtitle={t('profile.securitySubtitle')}
    >
      <ProfileSectionTitle>Sign-in</ProfileSectionTitle>
      <View style={styles.group}>
        <ChevronSettingRow
          icon="key-outline"
          title={t('profile.changePassword')}
          onPress={() => router.push('/(customer)/profile/security/change-password')}
        />
        <ChevronSettingRow
          icon="mail-outline"
          title={t('profile.changeEmail')}
          subtitle={currentEmail || undefined}
          onPress={() => router.push('/(customer)/profile/security/change-email')}
        />
        <ChevronSettingRow
          icon="call-outline"
          title={t('profile.changePhone')}
          subtitle={currentPhone || t('profile.changePhoneSub')}
          onPress={() => router.push('/(customer)/profile/security/change-phone')}
        />
        <ChevronSettingRow
          icon="refresh-outline"
          title={t('profile.resetPassword')}
          subtitle={t('profile.resetPasswordSub')}
          onPress={handleResetPassword}
          isLast
        />
      </View>

      {/* TODO: re-add biometric + 2FA toggles once they're backed by real
          services. `toggleBiometric` and `toggleTwoFactor` in
          lib/services/accountSecurity.ts are currently no-ops (intentional
          stubs), and shipping flippable rows that silently do nothing
          actively misleads users about their account security. Re-mount
          here once expo-local-authentication is wired for biometric and a
          real 2FA provider (TOTP / SMS) is decided. The local toggle
          state, i18n keys, and toggleX function signatures are preserved
          so re-adding is a copy-paste, not a rewrite. */}

      <ProfileSectionTitle>Devices</ProfileSectionTitle>
      <View style={styles.group}>
        <ChevronSettingRow
          icon="phone-portrait-outline"
          title={t('profile.activeSessions')}
          subtitle={t('profile.activeSessionsSub')}
          onPress={() => router.push('/(customer)/profile/security/sessions')}
          isLast
        />
      </View>
    </ProfileStackScreen>
  );
}
