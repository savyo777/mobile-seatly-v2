import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import type { OwnerFloorTable } from '@/lib/mock/ownerApp';
import { TABLE_AI_SUGGESTION } from '@/lib/mock/ownerApp';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';

type Props = {
  visible: boolean;
  table: OwnerFloorTable | null;
  onClose: () => void;
  onAddOrder: () => void;
  onSeat: () => void;
  onCleaning: () => void;
  onFree: () => void;
  onCloseBill: () => void;
};

export function TableDetailSheet({
  visible,
  table,
  onClose,
  onAddOrder,
  onSeat,
  onCleaning,
  onFree,
  onCloseBill,
}: Props) {
  const insets = useSafeAreaInsets();
  if (!table) return null;

  const bill =
    table.billCents != null ? formatCurrency(table.billCents / 100, 'cad') : '—';

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Table {table.tableNumber}</Text>
            <Text style={styles.sub}>
              {table.capacity} seats · {table.status}
            </Text>

            <View style={styles.block}>
              <Text style={styles.label}>Guest</Text>
              <Text style={styles.value}>{table.currentGuestName ?? '—'}</Text>
            </View>
            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Time seated</Text>
                <Text style={styles.value}>{table.seatedAt ?? '—'}</Text>
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Bill</Text>
                <Text style={styles.value}>{bill}</Text>
              </View>
            </View>

            <View style={styles.aiBox}>
              <Text style={styles.aiLabel}>AI</Text>
              <Text style={styles.aiText}>{TABLE_AI_SUGGESTION}</Text>
            </View>

            <View style={styles.grid3}>
              <Pressable style={({ pressed }) => [styles.cell, pressed && styles.pressed]} onPress={onSeat}>
                <Text style={styles.cellText}>Seat</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.cell, pressed && styles.pressed]} onPress={onCleaning}>
                <Text style={styles.cellText}>Cleaning</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.cell, pressed && styles.pressed]} onPress={onFree}>
                <Text style={styles.cellText}>Free</Text>
              </Pressable>
            </View>

            <Pressable style={({ pressed }) => [styles.action, pressed && styles.pressed]} onPress={onAddOrder}>
              <Text style={styles.actionText}>Add order</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.actionPrimary, pressed && styles.pressed]} onPress={onCloseBill}>
              <Text style={styles.actionPrimaryText}>Close bill</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: ownerColors.bgElevated,
    borderTopLeftRadius: ownerRadii['3xl'],
    borderTopRightRadius: ownerRadii['3xl'],
    borderWidth: 1,
    borderColor: ownerColors.border,
    paddingHorizontal: 24,
    paddingTop: 12,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: ownerColors.borderStrong,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: ownerColors.text,
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 15,
    color: ownerColors.textMuted,
    marginTop: 4,
    marginBottom: 20,
    textTransform: 'capitalize',
  },
  block: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  half: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: ownerColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  value: {
    fontSize: 17,
    fontWeight: '600',
    color: ownerColors.text,
  },
  aiBox: {
    padding: 16,
    borderRadius: ownerRadii.xl,
    backgroundColor: ownerColors.goldSubtle,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    marginBottom: 16,
  },
  aiLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: ownerColors.gold,
    letterSpacing: 1,
    marginBottom: 8,
  },
  aiText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: ownerColors.textSecondary,
  },
  grid3: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  cell: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: ownerRadii.xl,
    borderWidth: 1,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgGlass,
    alignItems: 'center',
  },
  cellText: {
    fontSize: 13,
    fontWeight: '800',
    color: ownerColors.gold,
  },
  action: {
    paddingVertical: 16,
    borderRadius: ownerRadii.xl,
    borderWidth: 1,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgGlass,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionPrimary: {
    paddingVertical: 16,
    borderRadius: ownerRadii.xl,
    backgroundColor: ownerColors.gold,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '700',
    color: ownerColors.text,
  },
  actionPrimaryText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#080B16',
  },
  pressed: {
    opacity: 0.9,
  },
});
