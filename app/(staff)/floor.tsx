import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '@/components/ui';
import { colors, spacing, borderRadius, typography, shadows } from '@/lib/theme';
import { mockTables, type Table } from '@/lib/mock/tables';

const SECTION_ORDER = ['Main Floor', 'Patio', 'Bar', 'Private Room'] as const;

function tableColor(status: Table['status']): string {
  switch (status) {
    case 'empty':
      return colors.tableEmpty;
    case 'reserved':
      return colors.tableReserved;
    case 'occupied':
      return colors.tableOccupied;
    case 'cleaning':
      return colors.tableCleaning;
    case 'blocked':
      return colors.tableBlocked;
    default:
      return colors.border;
  }
}

function tableFill(hex: string): string {
  return hex.length === 7 ? `${hex}33` : hex;
}

function statusLabel(status: Table['status'], t: (k: string) => string): string {
  const map: Record<Table['status'], string> = {
    empty: 'staff.empty',
    reserved: 'staff.reserved',
    occupied: 'staff.occupied',
    cleaning: 'staff.cleaning',
    blocked: 'staff.blocked',
  };
  return t(map[status]);
}

export default function FloorPlanScreen() {
  const { t } = useTranslation();

  const bySection = useMemo(() => {
    const m = new Map<string, Table[]>();
    for (const table of mockTables) {
      const list = m.get(table.section) ?? [];
      list.push(table);
      m.set(table.section, list);
    }
    return m;
  }, []);

  const openTable = (table: Table) => {
    Alert.alert(
      `${t('staff.table')} ${table.tableNumber}`,
      [
        `${t('staff.capacity')}: ${table.capacity}`,
        `${t('staff.guest')}: ${table.currentGuestName ?? t('staff.noGuest')}`,
        `${t('staff.status')}: ${statusLabel(table.status, t)}`,
      ].join('\n'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('staff.assignTable'), onPress: () => {} },
        { text: t('staff.clearTable'), onPress: () => {} },
      ],
    );
  };

  const legend = (
    <View style={styles.legend}>
      <LegendDot color={colors.tableEmpty} label={t('staff.empty')} />
      <LegendDot color={colors.tableReserved} label={t('staff.reserved')} />
      <LegendDot color={colors.tableOccupied} label={t('staff.occupied')} />
      <LegendDot color={colors.tableCleaning} label={t('staff.cleaning')} />
    </View>
  );

  return (
    <ScreenWrapper scrollable={false} padded>
      <Text style={styles.screenTitle}>{t('staff.floorPlan')}</Text>
      {legend}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {SECTION_ORDER.map((sectionName) => {
          const tables = bySection.get(sectionName);
          if (!tables?.length) return null;
          const title =
            sectionName === 'Main Floor'
              ? t('staff.mainFloor')
              : sectionName === 'Patio'
                ? t('staff.patio')
                : sectionName === 'Bar'
                  ? t('staff.bar')
                  : t('staff.privateRoom');
          return (
            <View key={sectionName} style={styles.section}>
              <Text style={styles.sectionLabel}>{title}</Text>
              <View style={styles.grid}>
                {tables.map((table) => (
                  <TouchableOpacity
                    key={table.id}
                    activeOpacity={0.85}
                    onPress={() => openTable(table)}
                    style={styles.tableWrap}
                  >
                    {table.shape === 'circle' ? (
                      <View
                        style={[
                          styles.tableCircle,
                          {
                            borderColor: tableColor(table.status),
                            backgroundColor: tableFill(tableColor(table.status)),
                          },
                        ]}
                      >
                        <Text style={styles.tableNum}>{table.tableNumber}</Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.tableRect,
                          {
                            borderColor: tableColor(table.status),
                            backgroundColor: tableFill(tableColor(table.status)),
                          },
                        ]}
                      >
                        <Text style={styles.tableNum}>{table.tableNumber}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </ScreenWrapper>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  legendText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  scroll: {
    paddingBottom: spacing['4xl'],
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionLabel: {
    ...typography.label,
    color: colors.gold,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tableWrap: {
    marginBottom: spacing.sm,
  },
  tableRect: {
    width: 72,
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  tableCircle: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  tableNum: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
