import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { createStyles } from '@/lib/theme';
import { ownerColorsFromPalette, ownerRadii, ownerSpace } from '@/lib/theme/ownerTheme';
import { OwnerSectionLabel } from './OwnerSectionLabel';

type Action = { key: string; label: string; onPress: () => void };

type Props = {
  actions: Action[];
};

export function QuickActions({ actions }: Props) {
  const { t } = useTranslation();
  const styles = useStyles();
  return (
    <View style={styles.wrap}>
      <OwnerSectionLabel>{t('owner.quickActionsTitle')}</OwnerSectionLabel>
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

const useStyles = createStyles((c) => {
  const ownerColors = ownerColorsFromPalette(c);
  return {
  wrap: {
    marginBottom: ownerSpace.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ownerSpace.xs,
  },
  btn: {
    width: '48%',
    flexGrow: 1,
    minWidth: '45%',
    paddingVertical: ownerSpace.md,
    paddingHorizontal: ownerSpace.sm,
    borderRadius: ownerRadii.md,
    backgroundColor: ownerColors.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
  },
  pressed: {
    opacity: 0.88,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
    color: ownerColors.text,
    textAlign: 'center',
  },
  };
});
