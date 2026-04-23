import React from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { GlassCard } from '@/components/owner/GlassCard';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { ownerColors } from '@/lib/theme/ownerTheme';

export default function OwnerSettingsScreen() {
  const { t } = useTranslation();
  const [pushOn, setPushOn] = React.useState(true);
  const [soundOn, setSoundOn] = React.useState(true);

  return (
    <OwnerScreen>
      <SubpageHeader
        title={t('owner.settingsTitle')}
        subtitle={t('owner.settingsSubtitle')}
        fallbackTab="more"
      />

      <GlassCard style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>{t('owner.settingsPush')}</Text>
          <Switch value={pushOn} onValueChange={setPushOn} trackColor={{ true: ownerColors.gold, false: ownerColors.border }} />
        </View>
        <View style={[styles.row, styles.rowBorder]}>
          <Text style={styles.label}>{t('owner.settingsSound')}</Text>
          <Switch value={soundOn} onValueChange={setSoundOn} trackColor={{ true: ownerColors.gold, false: ownerColors.border }} />
        </View>
      </GlassCard>

      <Pressable
        onPress={() => Alert.alert(t('owner.settingsAccount'), t('owner.settingsAccountMock'))}
        style={({ pressed }) => [styles.linkCard, pressed && styles.pressed]}
      >
        <GlassCard style={styles.card}>
          <Text style={styles.linkTitle}>{t('owner.settingsAccount')}</Text>
          <Text style={styles.linkSub}>{t('owner.settingsAccountHint')}</Text>
        </GlassCard>
      </Pressable>

      <View style={{ height: 24 }} />
    </OwnerScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 4,
  },
  rowBorder: {
    marginTop: 14,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ownerColors.border,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: ownerColors.text,
    flex: 1,
  },
  linkCard: {
    marginBottom: 0,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: ownerColors.text,
  },
  linkSub: {
    fontSize: 14,
    color: ownerColors.textMuted,
    marginTop: 6,
  },
  pressed: {
    opacity: 0.88,
  },
});
