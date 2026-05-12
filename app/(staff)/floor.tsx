import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { FloorCanvas } from '@/components/owner/FloorCanvas';
import { TableDetailSheet } from '@/components/owner/TableDetailSheet';
import { RestaurantPicker } from '@/components/owner/RestaurantPicker';
import { OWNER_FLOOR_TABLES as DEMO_OWNER_FLOOR_TABLES, type OwnerFloorTable } from '@/lib/mock/ownerApp';
import type { Table } from '@/lib/mock/tables';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { getSupabase } from '@/lib/supabase/client';
import { useOwnerScope } from '@/hooks/useOwnerScope';
import { updateTableServiceStatus } from '@/lib/staff/staffServices';
import { fetchFloorCapacity } from '@/lib/owner/floorCapacity';
import { useColors, spacing } from '@/lib/theme';

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function normalizeStatus(s: unknown): Table['status'] {
  const v = typeof s === 'string' ? s.toLowerCase() : '';
  if (v === 'occupied' || v === 'reserved' || v === 'cleaning' || v === 'blocked') return v;
  if (v === 'available' || v === 'free' || v === 'empty' || v === '') return 'empty';
  return 'empty';
}

function rowToFloorTable(row: Record<string, unknown>): OwnerFloorTable {
  const label =
    (typeof row.label === 'string' && row.label) ||
    (typeof row.table_number === 'string' && row.table_number) ||
    String(row.id ?? '').slice(0, 4);
  const shape = (typeof row.shape === 'string' && row.shape.toLowerCase().includes('round'))
    || (typeof row.shape === 'string' && row.shape.toLowerCase() === 'circle')
    ? 'circle'
    : 'rect';
  return {
    id: String(row.id ?? ''),
    tableNumber: String(label),
    x: num(row.position_x, 0),
    y: num(row.position_y, 0),
    w: 72,
    h: 56,
    shape,
    status: normalizeStatus(row.status),
    capacity: num(row.capacity, 0),
  };
}

export default function OwnerFloorScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const { selectedRestaurantId, isAll } = useOwnerScope();
  const restaurantId = selectedRestaurantId;
  const [selected, setSelected] = useState<OwnerFloorTable | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [floorTables, setFloorTables] = useState<OwnerFloorTable[]>(
    isDemoModeEnabled() ? DEMO_OWNER_FLOOR_TABLES : [],
  );
  const [capacity, setCapacity] = useState<number | null>(null);

  const loadTables = useCallback(async (rid: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase
      .from('tables')
      .select('id,restaurant_id,table_number,label,capacity,status,position_x,position_y,shape,section_id,is_active')
      .eq('restaurant_id', rid)
      .eq('is_active', true);
    setFloorTables(((data ?? []) as Array<Record<string, unknown>>).map(rowToFloorTable));
  }, []);

  useEffect(() => {
    if (isDemoModeEnabled()) return;
    if (!restaurantId || isAll) {
      setFloorTables([]);
      setCapacity(null);
      return;
    }
    let active = true;
    void (async () => {
      try {
        await loadTables(restaurantId);
        try {
          const cap = await fetchFloorCapacity(restaurantId);
          if (!active) return;
          setCapacity(cap);
        } catch {
          // ignore — fall back to client-side sum of loaded tables
        }
      } catch {
        // silent
      }
    })();
    return () => {
      active = false;
    };
  }, [loadTables, restaurantId, isAll]);

  const onTablePress = (table: OwnerFloorTable) => {
    setSelected(table);
    setSheetOpen(true);
  };

  const close = () => setSheetOpen(false);

  const handleStatusChange = useCallback(
    (status: Table['status']) => {
      if (!selected) return close();
      // optimistic local update
      setFloorTables((prev) =>
        prev.map((row) => (row.id === selected.id ? { ...row, status } : row)),
      );
      if (!isDemoModeEnabled()) {
        void (async () => {
          await updateTableServiceStatus({ tableId: selected.id, status });
          if (restaurantId) await loadTables(restaurantId);
        })();
      }
      close();
    },
    [selected, restaurantId, loadTables],
  );

  const seatedCapacity = capacity ?? floorTables.reduce((s, x) => s + (x.capacity ?? 0), 0);
  const tablesCount = floorTables.length;

  return (
    <OwnerScreen
      scrollable={false}
      header={
        <SubpageHeader
          title={t('owner.floorLive')}
          subtitle={
            isAll
              ? 'Pick a restaurant to view its floor plan'
              : tablesCount
                ? `${tablesCount} tables · ${seatedCapacity} seats`
                : 'No tables configured'
          }
          fallbackTab="home"
        />
      }
    >
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm }}>
        <RestaurantPicker allowAll={false} size="compact" />
      </View>
      {isAll ? (
        <View style={{ padding: spacing.lg, alignItems: 'center' }}>
          <Text style={{ color: c.textMuted, fontSize: 14, fontWeight: '500', textAlign: 'center' }}>
            Pick a restaurant to manage its floor plan.
          </Text>
        </View>
      ) : tablesCount === 0 ? (
        <View style={{ padding: spacing.lg, alignItems: 'center' }}>
          <Text style={{ color: c.textMuted, fontSize: 14, fontWeight: '500' }}>
            No floor plan yet — add tables in business settings.
          </Text>
        </View>
      ) : null}
      {!isAll ? (
        <View style={styles.flex}>
          <FloorCanvas tables={floorTables} onTablePress={onTablePress} />
        </View>
      ) : null}
      <TableDetailSheet
        visible={sheetOpen}
        table={selected}
        onClose={close}
        onAddOrder={close}
        onSeat={() => handleStatusChange('occupied')}
        onCleaning={() => handleStatusChange('cleaning')}
        onFree={() => handleStatusChange('empty')}
        onCloseBill={() => handleStatusChange('empty')}
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
