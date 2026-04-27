import React from 'react';
import { Linking, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { createStyles, spacing, typography } from '@/lib/theme';

const TERMS_URL = 'https://cenaiva.com/terms';
const PRIVACY_URL = 'https://cenaiva.com/privacy';

export function TermsFooter() {
  const { t } = useTranslation();
  const styles = useStyles();

  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>
        {t('auth.termsAgreement')}{' '}
        <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>
          {t('auth.termsOfService')}
        </Text>{' '}
        {t('auth.termsAnd')}{' '}
        <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>
          {t('auth.privacyPolicy')}
        </Text>
        .
      </Text>
    </View>
  );
}

const useStyles = createStyles((c) => ({
  wrap: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  text: {
    ...typography.bodySmall,
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: c.gold,
    fontWeight: '600',
  },
}));
