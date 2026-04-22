import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { useColors, createStyles, spacing, borderRadius, typography } from '@/lib/theme';

const LANG_KEY = '@seatly/lang';

const useStyles = createStyles((c) => ({
  group: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  rowPressed: {
    backgroundColor: c.bgElevated,
  },
  flag: {
    fontSize: 26,
    width: 36,
    textAlign: 'center',
  },
  rowTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: c.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkFilled: {
    backgroundColor: c.gold,
  },
  hint: {
    ...typography.bodySmall,
    color: c.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 19,
    paddingHorizontal: spacing.lg,
  },
}));

type Lang = { code: string; label: string; flag: string };
const LANGUAGES: Lang[] = [
  { code: 'en', label: 'English', flag: '🇨🇦' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
];

export default function LanguageScreen() {
  const { t, i18n } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const [selected, setSelected] = useState(i18n.language.split('-')[0]);

  const handleSelect = async (code: string) => {
    setSelected(code);
    await i18n.changeLanguage(code);
    await AsyncStorage.setItem(LANG_KEY, code);
  };

  return (
    <ProfileStackScreen title={t('profile.language')} subtitle={t('profile.languageSub')}>
      <View style={styles.group}>
        {LANGUAGES.map((lang, i) => (
          <Pressable
            key={lang.code}
            onPress={() => handleSelect(lang.code)}
            style={({ pressed }) => [
              styles.row,
              i < LANGUAGES.length - 1 && styles.rowBorder,
              pressed && styles.rowPressed,
            ]}
          >
            <Text style={styles.flag}>{lang.flag}</Text>
            <Text style={styles.rowTitle}>{lang.label}</Text>
            <View style={[styles.check, selected === lang.code && styles.checkFilled]}>
              {selected === lang.code && (
                <Ionicons name="checkmark" size={13} color={c.bgBase} />
              )}
            </View>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>
        Language changes apply immediately across all screens.
      </Text>
    </ProfileStackScreen>
  );
}
