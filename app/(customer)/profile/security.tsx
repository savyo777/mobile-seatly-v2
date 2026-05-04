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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthSession } from '@/lib/auth/AuthContext';

const BIOMETRIC_KEY = '@seatly/biometric';
const TWO_FA_KEY = '@seatly/twofactor';

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
  const currentPhone = user?.phone ? `+${user.phone}` : '';

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
                Alert.alert('Error', 'No account email is available for password reset.');
                return;
              }
              await sendPasswordResetEmail(currentEmail);
              Alert.alert(
                'Email sent',
                t('profile.resetPasswordSent', { email: currentEmail }),
              );
            } catch (e: any) {
              Alert.alert('Error', e.message);
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

      <ProfileSectionTitle>Authentication</ProfileSectionTitle>
      <View style={styles.group}>
        <ToggleRow
          title={t('profile.biometric')}
          subtitle={t('profile.biometricSub')}
          value={biometric}
          onValueChange={handleBiometricToggle}
        />
        <ToggleRow
          title={t('profile.twoFactor')}
          subtitle={t('profile.twoFactorSub')}
          value={twoFa}
          onValueChange={handleTwoFaToggle}
          isLast
        />
      </View>

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
