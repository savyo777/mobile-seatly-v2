import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn } from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { FloorCanvas } from '@/components/owner/FloorCanvas';
import { TableDetailSheet } from '@/components/owner/TableDetailSheet';
import { OWNER_FLOOR_TABLES, type OwnerFloorTable } from '@/lib/mock/ownerApp';
import { ownerColors } from '@/lib/theme/ownerTheme';
import { ownerSpace } from '@/lib/theme/ownerTheme';

export default function OwnerFloorScreen() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<OwnerFloorTable | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const onTablePress = (table: OwnerFloorTable) => {
    setSelected(table);
    setSheetOpen(true);
  };

  const close = () => setSheetOpen(false);

  return (
    <OwnerScreen scrollable={false}>
      <Animated.View entering={FadeIn.duration(380)}>
        <Text style={styles.title}>{t('owner.floorLive')}</Text>
        <Text style={styles.sub}>Nova Ristorante · Live</Text>
      </Animated.View>
      <View style={styles.flex}>
        <FloorCanvas tables={OWNER_FLOOR_TABLES} onTablePress={onTablePress} />
      </View>
      <TableDetailSheet
        visible={sheetOpen}
        table={selected}
        onClose={close}
        onAddOrder={close}
        onSeat={close}
        onCleaning={close}
        onFree={close}
        onCloseBill={close}
      />
    </OwnerScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: ownerColors.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  sub: {
    fontSize: 15,
    color: ownerColors.textMuted,
    marginBottom: ownerSpace.md,
    fontWeight: '500',
  },
  flex: {
    flex: 1,
    minHeight: 380,
  },
});
