import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import {
  ScreenWrapper,
  Input,
  Button,
  SocialAuthButtons,
  Checkbox,
} from '@/components/ui';

const TERMS_URL = 'https://cenaiva.com/terms';
const PRIVACY_URL = 'https://cenaiva.com/privacy';

type Role = 'diner' | 'owner';

function passwordScore(pw: string): 0 | 1 | 2 | 3 {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score as 0 | 1 | 2 | 3;
}

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
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: 4,
    gap: 4,
    marginBottom: spacing.lg,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  toggleBtnOn: {
    backgroundColor: c.gold,
  },
  toggleText: {
    ...typography.body,
    fontWeight: '700',
    color: c.textMuted,
  },
  toggleTextOn: { color: '#0F0E0C' },
  pwMeter: {
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing.sm,
  },
  pwSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.bgElevated,
  },
  pwSegOn: { backgroundColor: c.gold },
  pwHintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: spacing.md,
  },
  pwHint: { ...typography.bodySmall, color: c.textMuted },
  pwLabel: { ...typography.bodySmall, color: c.gold, fontWeight: '700' },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  termsText: {
    ...typography.body,
    color: c.textSecondary,
    flexShrink: 1,
  },
  termsLink: { color: c.gold, fontWeight: '700' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
  },
  dividerText: {
    ...typography.bodySmall,
    color: c.textMuted,
    textTransform: 'lowercase',
  },
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

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();

  const [role, setRole] = useState<Role>('diner');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(true);

  const score = useMemo(() => passwordScore(password), [password]);
  const strengthLabel =
    score === 3 ? t('auth.pwStrengthStrong') : score === 2 ? t('auth.pwStrengthMedium') : t('auth.pwStrengthWeak');

  const onSelectRole = (next: Role) => {
    if (next === role) return;
    setRole(next);
    if (next === 'owner') {
      router.replace('/(auth)/owner-register');
    }
  };

  const onSuccess = () => {
    router.replace('/(customer)');
  };

  return (
    <ScreenWrapper scrollable withKeyboardAvoiding padded>
      <View style={[styles.inner, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/welcome')}
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

        <Text style={styles.heading}>{t('auth.registerHeading')}</Text>
        <Text style={styles.subcopy}>{t('auth.registerTakesAbout')}</Text>

        <View style={styles.toggleRow}>
          <TouchableOpacity
            onPress={() => onSelectRole('diner')}
            style={[styles.toggleBtn, role === 'diner' && styles.toggleBtnOn]}
            activeOpacity={0.85}
          >
            <Ionicons name="person-outline" size={16} color={role === 'diner' ? '#0F0E0C' : c.textMuted} />
            <Text style={[styles.toggleText, role === 'diner' && styles.toggleTextOn]}>
              {t('auth.diner')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onSelectRole('owner')}
            style={[styles.toggleBtn, role === 'owner' && styles.toggleBtnOn]}
            activeOpacity={0.85}
          >
            <Ionicons name="storefront-outline" size={16} color={role === 'owner' ? '#0F0E0C' : c.textMuted} />
            <Text style={[styles.toggleText, role === 'owner' && styles.toggleTextOn]}>
              {t('auth.owner')}
            </Text>
          </TouchableOpacity>
        </View>

        <Input icon="person-outline" placeholder={t('auth.fullName')} autoCapitalize="words" />
        <Input
          icon="mail-outline"
          placeholder={t('auth.email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Input
          icon="lock-closed-outline"
          placeholder={t('auth.password')}
          isPassword
          value={password}
          onChangeText={setPassword}
        />

        <View style={styles.pwMeter}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.pwSeg, i < score && styles.pwSegOn]} />
          ))}
        </View>
        <View style={styles.pwHintRow}>
          <Text style={styles.pwHint}>{t('auth.pwHintShort')}</Text>
          {password.length > 0 ? <Text style={styles.pwLabel}>{strengthLabel}</Text> : null}
        </View>

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
          title={t('auth.createAccount')}
          onPress={onSuccess}
          size="lg"
          disabled={!agree}
        />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.orSignUpWith')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <SocialAuthButtons onApple={onSuccess} onGoogle={onSuccess} />

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
