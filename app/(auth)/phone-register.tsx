import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createStyles, spacing, typography, useColors } from '@/lib/theme';
import { ScreenWrapper, Input, Button, Checkbox } from '@/components/ui';
import { normalizePhoneToE164, sendPhoneOtp } from '@/lib/services/phoneAuth';
import { TERMS_URL, PRIVACY_URL } from '@/lib/config/legalLinks';
import { normalizeName } from '@/lib/validation/input';
import { friendlyError } from '@/lib/errors/friendlyError';

const useStyles = createStyles((c) => ({
  inner: {
    flexGrow: 1,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backText: {
    ...typography.body,
    color: c.textSecondary,
  },
  brandText: {
    fontFamily: 'Georgia',
    fontSize: 18,
    fontWeight: '700',
    color: c.gold,
    letterSpacing: 5,
  },
  topRight: { width: 60 },
  heading: {
    ...typography.serifDisplay,
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subcopy: {
    ...typography.body,
    color: c.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  termsText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    flexShrink: 1,
    lineHeight: 19,
    fontWeight: '500',
  },
  termsLink: { color: c.gold, fontWeight: '700' },
  spacer: { flex: 1, minHeight: spacing.lg },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  footerMuted: { ...typography.body, color: c.textSecondary },
  footerLink: { ...typography.body, color: c.gold, fontWeight: '700' },
}));

export default function PhoneRegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSendCode = async () => {
    if (submitting) return;
    if (!agree) {
      Alert.alert(
        'Agreement required',
        'Please agree to the Terms of Service and Privacy Policy before continuing.',
      );
      return;
    }
    const e164 = normalizePhoneToE164(phone);
    if (!e164) {
      Alert.alert(
        'Invalid phone',
        'Please enter a valid phone number (include country code, or 10-digit US number).',
      );
      return;
    }
    const trimmedName = normalizeName(fullName);
    setSubmitting(true);
    try {
      const { error } = await sendPhoneOtp(e164, {
        shouldCreateUser: true,
        metadata: {
          role: 'diner',
          ...(trimmedName ? { full_name: trimmedName } : {}),
        },
      });
      if (error) {
        Alert.alert('SMS failed', friendlyError(error, "Couldn't send the code. Please try again."));
        return;
      }
      router.push({
        pathname: '/(auth)/verify-phone-otp',
        params: {
          phone: encodeURIComponent(e164),
          source: 'register',
          ...(trimmedName ? { fullName: encodeURIComponent(trimmedName) } : {}),
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canSend = agree && phone.trim().length > 0 && !submitting;

  return (
    <ScreenWrapper scrollable withKeyboardAvoiding padded>
      <View style={[styles.inner, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/register')}
            style={styles.backBtn}
            activeOpacity={0.7}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={20} color={c.textSecondary} />
            <Text style={styles.backText}>{t('auth.backToWelcome')}</Text>
          </TouchableOpacity>
          <Text style={styles.brandText}>{t('common.appName')}</Text>
          <View style={styles.topRight} />
        </View>

        <Text style={styles.heading}>Sign up with your phone</Text>
        <Text style={styles.subcopy}>
          We&apos;ll text you a 6-digit code. No password needed.
        </Text>

        <Input
          icon="person-outline"
          placeholder={`${t('auth.fullName')} (optional)`}
          autoCapitalize="words"
          value={fullName}
          onChangeText={setFullName}
        />
        <Input
          icon="call-outline"
          placeholder={t('auth.phone')}
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
          value={phone}
          onChangeText={setPhone}
        />

        <View style={styles.termsRow}>
          <Checkbox
            checked={agree}
            onChange={setAgree}
            label={
              <Text style={styles.termsText}>
                {t('auth.iAgreeTo')}{' '}
                <Text style={styles.termsLink} onPress={() => Linking.openURL(TERMS_URL)}>
                  {t('auth.termsShort')}
                </Text>{' '}
                &{' '}
                <Text style={styles.termsLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
                  {t('auth.privacyShort')}
                </Text>
              </Text>
            }
          />
        </View>

        <Button
          title={t('auth.sendSmsCode')}
          onPress={onSendCode}
          size="lg"
          disabled={!canSend}
        />

        <View style={styles.spacer} />

        <View style={styles.footerRow}>
          <Text style={styles.footerMuted}>{t('auth.alreadyHaveAccount')} </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} activeOpacity={0.7}>
            <Text style={styles.footerLink}>{t('auth.alreadyHaveSignIn')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
}
