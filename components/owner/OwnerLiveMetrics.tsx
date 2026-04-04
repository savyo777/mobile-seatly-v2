import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LIVE_METRICS } from '@/lib/mock/ownerApp';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';
import { GlassCard } from './GlassCard';

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
      <Text style={styles.sectionLabel}>{t('owner.liveMetricsTitle')}</Text>
      <View style={styles.grid}>
        {tiles.map((tile) => (
          <GlassCard key={tile.key} style={[styles.tile, tile.danger && styles.tileDanger]}>
            <Text style={styles.tileValue}>{tile.value}</Text>
            <Text style={styles.tileLabel}>{tile.label}</Text>
          </GlassCard>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 24,
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
    gap: 10,
  },
  tile: {
    width: '47%',
    padding: 16,
    minHeight: 96,
    justifyContent: 'center',
  },
  tileDanger: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  tileValue: {
    fontSize: 26,
    fontWeight: '800',
    color: ownerColors.text,
    marginBottom: 6,
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: ownerColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
