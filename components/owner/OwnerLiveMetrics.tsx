import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LIVE_METRICS } from '@/lib/mock/ownerApp';
import { ownerColors, ownerSpace } from '@/lib/theme/ownerTheme';
import { OwnerSectionLabel } from './OwnerSectionLabel';

export function OwnerLiveMetrics() {
  const { t } = useTranslation();

  const tiles = [
    { key: 'covers', label: t('owner.metricTonightCovers'), value: String(LIVE_METRICS.tonightCovers) },
    { key: 'open', label: t('owner.metricOpenTables'), value: String(LIVE_METRICS.openTables) },
    { key: 'orders', label: t('owner.metricActiveOrders'), value: String(LIVE_METRICS.activeOrders) },
    { key: 'risk', label: t('owner.metricNoShowRisks'), value: String(LIVE_METRICS.noShowRisks), danger: true },
  ];

  return (
    <View style={styles.wrap}>
      <OwnerSectionLabel>{t('owner.liveMetricsTitle')}</OwnerSectionLabel>
      <View style={styles.grid}>
        {tiles.map((tile, index) => {
          const isRight = index % 2 === 1;
          const isBottom = index >= 2;
          return (
            <View
              key={tile.key}
              style={[
                styles.cell,
                !isRight && styles.cellBorderRight,
                !isBottom && styles.cellBorderBottom,
                tile.danger && styles.cellDanger,
              ]}
            >
              <Text style={[styles.tileValue, tile.danger && styles.tileValueDanger]}>{tile.value}</Text>
              <Text style={styles.tileLabel}>{tile.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const hair = StyleSheet.hairlineWidth;

const styles = StyleSheet.create({
  wrap: {
    marginBottom: ownerSpace.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 12,
    borderWidth: hair,
    borderColor: ownerColors.border,
    overflow: 'hidden',
    backgroundColor: ownerColors.bgSurface,
  },
  cell: {
    width: '50%',
    paddingVertical: ownerSpace.sm,
    paddingHorizontal: ownerSpace.sm,
    minHeight: 76,
    justifyContent: 'center',
  },
  cellBorderRight: {
    borderRightWidth: hair,
    borderRightColor: ownerColors.border,
  },
  cellBorderBottom: {
    borderBottomWidth: hair,
    borderBottomColor: ownerColors.border,
  },
  cellDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  tileValue: {
    fontSize: 26,
    fontWeight: '700',
    color: ownerColors.text,
    marginBottom: ownerSpace.xs,
    letterSpacing: -0.5,
  },
  tileValueDanger: {
    color: ownerColors.danger,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: ownerColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
