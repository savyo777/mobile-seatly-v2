import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { GlassCard } from '@/components/owner/GlassCard';
import { EXPORT_OPTIONS } from '@/lib/mock/ownerApp';
import { ownerColors } from '@/lib/theme/ownerTheme';

export default function OwnerExportScreen() {
  const { t } = useTranslation();

  return (
    <OwnerScreen>
      <Text style={styles.title}>{t('owner.exportTitle')}</Text>
      <Text style={styles.sub}>{t('owner.exportSubtitle')}</Text>

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

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: ownerColors.text,
    marginBottom: 6,
  },
  sub: {
    fontSize: 15,
    color: ownerColors.textMuted,
    marginBottom: 16,
  },
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
});
