import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { GlassCard } from '@/components/owner/GlassCard';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { EXPORT_OPTIONS as DEMO_EXPORT_OPTIONS, type ExportOptionRow } from '@/lib/mock/ownerApp';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { getSupabase } from '@/lib/supabase/client';
import { fetchCurrentUserProfile } from '@/lib/services/userProfile';
import { createStyles } from '@/lib/theme';
import { ownerColorsFromPalette } from '@/lib/theme/ownerTheme';

function formatDateRange(from?: string | null, to?: string | null): string {
  if (!from && !to) return '';
  if (from && to) return `${from} → ${to}`;
  return from ?? to ?? '';
}

export default function OwnerExportScreen() {
  const { t } = useTranslation();
  const styles = useStyles();
  const [exportOptions, setExportOptions] = useState<ExportOptionRow[]>(
    isDemoModeEnabled() ? DEMO_EXPORT_OPTIONS : [],
  );

  useEffect(() => {
    if (isDemoModeEnabled()) return;
    let active = true;
    void (async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) return;
        const profile = await fetchCurrentUserProfile();
        const restaurantId = profile?.restaurantId;
        if (!restaurantId) return;
        const { data } = await supabase
          .from('accountant_exports')
          .select('id,status,date_from,date_to,includes,created_at,file_url')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false })
          .limit(50);
        if (!active) return;
        const rows = ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
          const includes = Array.isArray(row.includes) ? (row.includes as string[]) : [];
          const range = formatDateRange(
            (row.date_from as string | undefined) ?? null,
            (row.date_to as string | undefined) ?? null,
          );
          const subParts = [range, includes.join(' · '), String(row.status ?? '')].filter(Boolean);
          return {
            id: String(row.id ?? ''),
            title: includes[0] ? `Export: ${includes.join(', ')}` : `Export ${String(row.id ?? '').slice(0, 8)}`,
            subtitle: subParts.join(' · '),
          } satisfies ExportOptionRow;
        });
        setExportOptions(rows);
      } catch {
        // swallow
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title={t('owner.exportTitle')}
          subtitle={t('owner.exportSubtitle')}
          fallbackTab="more"
        />
      }
    >
      {exportOptions.map((row, i) => (
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

const useStyles = createStyles((c) => {
  const ownerColors = ownerColorsFromPalette(c);
  return {
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
  };
});
