import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { FloorCanvas } from '@/components/owner/FloorCanvas';
import { TableDetailSheet } from '@/components/owner/TableDetailSheet';
import { OWNER_FLOOR_TABLES, type OwnerFloorTable } from '@/lib/mock/ownerApp';

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
      <SubpageHeader
        title={t('owner.floorLive')}
        subtitle="Nova Ristorante · Live"
        fallbackTab="home"
      />
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
  flex: {
    flex: 1,
    minHeight: 380,
  },
});
