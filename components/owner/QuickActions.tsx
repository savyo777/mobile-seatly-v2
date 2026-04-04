import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ownerColors, ownerRadii, ownerShadow } from '@/lib/theme/ownerTheme';

type Action = { key: string; label: string; onPress: () => void };

type Props = {
  actions: Action[];
};

export function QuickActions({ actions }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>{t('owner.quickActionsTitle')}</Text>
      <View style={styles.grid}>
        {actions.map((a) => (
          <Pressable
            key={a.key}
            onPress={a.onPress}
            style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
          >
            <Text style={styles.btnText}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: ownerColors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  btn: {
    width: '47%',
    minWidth: '45%',
    flexGrow: 1,
    paddingVertical: 22,
    paddingHorizontal: 16,
    borderRadius: ownerRadii['2xl'],
    backgroundColor: ownerColors.bgElevated,
    borderWidth: 1,
    borderColor: ownerColors.border,
    ...ownerShadow.card,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: ownerColors.text,
    textAlign: 'center',
  },
});
