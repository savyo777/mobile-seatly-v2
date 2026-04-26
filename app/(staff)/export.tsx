import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { GlassCard } from '@/components/owner/GlassCard';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { EXPORT_OPTIONS } from '@/lib/mock/ownerApp';
import { createStyles } from '@/lib/theme';
import { ownerColorsFromPalette } from '@/lib/theme/ownerTheme';

export default function OwnerExportScreen() {
  const { t } = useTranslation();
  const styles = useStyles();

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title={t('owner.exportTitle')}
          subtitle={t('owner.exportSubtitle')}
          fallbackTab="more"
        />
      }
    >
      {EXPORT_OPTIONS.map((row, i) => (
        <Animated.View key={row.id} entering={FadeInDown.delay(i * 40)}>
          <Pressable
            onPress={() => Alert.alert(row.title, t('owner.exportMock'))}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <GlassCard style={styles.card}>
              <Text style={styles.rowTitle}>{row.title}</Text>
              <Text style={styles.rowSub}>{row.subtitle}</Text>
            </GlassCard>
          </Pressable>
        </Animated.View>
      ))}
      <View style={{ height: 24 }} />
    </OwnerScreen>
  );
}

const useStyles = createStyles((c) => {
  const ownerColors = ownerColorsFromPalette(c);
  return {
  card: {
    padding: 16,
    marginBottom: 10,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: ownerColors.text,
  },
  rowSub: {
    fontSize: 14,
    color: ownerColors.textMuted,
    marginTop: 6,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.88,
  },
  };
});
