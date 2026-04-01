import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { mockTables, Table } from '@/lib/mock/tables';
import { colors, borderRadius, spacing, typography, shadows } from '@/lib/theme';

// ─── Customer-friendly display metadata ──────────────────────────────────────
interface TableDisplay {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  friendlyName: string;
  tags: string;
}

function getTableDisplay(table: Table): TableDisplay {
  const label = table.label.toLowerCase();
  const section = table.section.toLowerCase();

  if (label.includes('window')) {
    return {
      icon: 'partly-sunny-outline',
      iconColor: '#F5C842',
      friendlyName: 'Window Table',
      tags: `Seats ${table.capacity} · Best view · Natural light`,
    };
  }
  if (label.includes('booth')) {
    return {
      icon: 'shield-checkmark-outline',
      iconColor: '#A78BFA',
      friendlyName: 'Booth Seating',
      tags: `Seats ${table.capacity} · Private booth · Extra cozy`,
    };
  }
  if (section.includes('patio') || label.includes('patio')) {
    return {
      icon: 'leaf-outline',
      iconColor: '#4ADE80',
      friendlyName: 'Patio Table',
      tags: `Seats ${table.capacity} · Outdoor · Fresh air`,
    };
  }
  if (section.includes('bar') || label.includes('bar')) {
    return {
      icon: 'wine-outline',
      iconColor: '#F87171',
      friendlyName: 'Bar Seating',
      tags: `Seats ${table.capacity} · Bar area · Lively atmosphere`,
    };
  }
  if (section.includes('private') || label.includes('private')) {
    return {
      icon: 'lock-closed-outline',
      iconColor: colors.gold,
      friendlyName: 'Private Room',
      tags: `Seats ${table.capacity} · Fully private · Ideal for events`,
    };
  }
  if (label.includes('center') || section.includes('main')) {
    return {
      icon: 'restaurant-outline',
      iconColor: '#94A3B8',
      friendlyName: 'Dining Room Table',
      tags: `Seats ${table.capacity} · Main floor · Classic setting`,
    };
  }
  return {
    icon: 'grid-outline',
    iconColor: colors.textSecondary,
    friendlyName: table.label,
    tags: `Seats ${table.capacity}`,
  };
}

// ─── Table option card ────────────────────────────────────────────────────────
interface TableOptionCardProps {
  table: Table;
  display: TableDisplay;
  isSelected: boolean;
  isRecommended: boolean;
  onPress: () => void;
}

function TableOptionCard({
  table,
  display,
  isSelected,
  isRecommended,
  onPress,
}: TableOptionCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[
        styles.optionCard,
        isSelected && styles.optionCardSelected,
      ]}
    >
      {/* Table type icon */}
      <View style={[styles.emojiWrap, isSelected && styles.emojiWrapSelected]}>
        <Ionicons
          name={display.icon}
          size={22}
          color={isSelected ? colors.gold : display.iconColor}
        />
      </View>

      {/* Label + meta */}
      <View style={styles.optionBody}>
        <View style={styles.optionTitleRow}>
          <Text
            style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}
            numberOfLines={1}
          >
            {display.friendlyName}
          </Text>
          {isRecommended && (
            <View style={[styles.aiBadge, isSelected && styles.aiBadgeSelected]}>
              <Ionicons
                name="sparkles"
                size={9}
                color={isSelected ? colors.gold : colors.bgBase}
              />
              <Text style={[styles.aiBadgeText, isSelected && styles.aiBadgeTextSelected]}>
                AI Pick
              </Text>
            </View>
          )}
        </View>
        <Text
          style={[styles.optionTags, isSelected && styles.optionTagsSelected]}
          numberOfLines={1}
        >
          {display.tags}
        </Text>
        {/* Subtle table number for reference */}
        <Text style={[styles.optionId, isSelected && styles.optionIdSelected]}>
          {table.tableNumber}
        </Text>
      </View>

      {/* Selection indicator */}
      <View style={styles.checkWrap}>
        {isSelected ? (
          <View style={styles.checkActive}>
            <Ionicons name="checkmark" size={13} color={colors.bgBase} />
          </View>
        ) : (
          <View style={styles.checkIdle} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function Step3Table() {
  const { restaurantId, date, time, partySize } = useLocalSearchParams<{
    restaurantId: string;
    date: string;
    time: string;
    partySize: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const progress = 3 / 7;
  const party = parseInt(partySize || '2', 10);

  const availableTables = mockTables.filter(
    (tb) =>
      tb.restaurantId === restaurantId &&
      tb.status === 'empty' &&
      tb.capacity >= party,
  );

  const recommendedTable = useMemo(
    () =>
      availableTables.find((tb) => tb.tableNumber === 'T1') ??
      availableTables[0] ??
      null,
    [availableTables],
  );

  useEffect(() => {
    if (!selectedTable && recommendedTable) {
      setSelectedTable(recommendedTable.id);
    }
  }, [recommendedTable, selectedTable]);

  const nextUrl = `/booking/${restaurantId}/step4-preorder?date=${date}&time=${time}&partySize=${partySize}&tableId=${selectedTable || 'auto'}`;

  const recommendedDisplay = recommendedTable
    ? getTableDisplay(recommendedTable)
    : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.stepLabel}>Step 3 of 7</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{t('booking.step3Title')}</Text>
          <Text style={styles.subtitle}>
            {availableTables.length} options available · party of {party}
          </Text>
        </View>

        {/* AI recommendation banner */}
        {!!recommendedTable && !!recommendedDisplay && (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => setSelectedTable(recommendedTable.id)}
            style={styles.recommendBanner}
          >
            <View style={styles.recommendLeft}>
              <Ionicons name="sparkles" size={14} color={colors.gold} />
              <Text style={styles.recommendLabel}>AI Recommendation</Text>
            </View>
            <View style={styles.recommendBodyRow}>
              <View style={styles.recommendIconWrap}>
                <Ionicons
                  name={recommendedDisplay.icon}
                  size={16}
                  color={recommendedDisplay.iconColor}
                />
              </View>
              <Text style={styles.recommendBody}>
                {recommendedDisplay.friendlyName}
                <Text style={styles.recommendReason}>
                  {' '}— quieter spot, best lighting, matches your preferences
                </Text>
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Divider */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>Available tables</Text>
        </View>

        {/* Table options */}
        <View style={styles.optionList}>
          {availableTables.map((table) => (
            <TableOptionCard
              key={table.id}
              table={table}
              display={getTableDisplay(table)}
              isSelected={selectedTable === table.id}
              isRecommended={table.id === recommendedTable?.id}
              onPress={() => setSelectedTable(table.id)}
            />
          ))}
        </View>

        {/* Auto-assign option */}
        <TouchableOpacity
          onPress={() => {
            setSelectedTable(null);
            router.push(
              `/booking/${restaurantId}/step4-preorder?date=${date}&time=${time}&partySize=${partySize}&tableId=auto`,
            );
          }}
          style={styles.autoAssignBtn}
        >
          <Ionicons name="shuffle-outline" size={16} color={colors.textMuted} />
          <Text style={styles.autoAssignText}>{t('booking.skipTableSelection')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button title={t('common.next')} onPress={() => router.push(nextUrl)} size="lg" />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  progressBar: {
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xl,
    borderRadius: 2,
  },
  progressFill: {
    height: 2,
    backgroundColor: colors.gold,
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
  },

  // Title block
  titleBlock: {
    marginTop: spacing['3xl'],
    marginBottom: spacing['2xl'],
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },

  // AI recommendation banner
  recommendBanner: {
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing['2xl'],
    ...shadows.goldGlow,
  },
  recommendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  recommendLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  recommendBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  recommendIconWrap: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  recommendBody: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    lineHeight: 20,
  },
  recommendReason: {
    fontWeight: '400',
    color: colors.textSecondary,
  },

  // Section header
  sectionRow: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Option list
  optionList: {
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },

  // Individual card
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  optionCardSelected: {
    borderColor: colors.gold,
    backgroundColor: colors.bgElevated,
    shadowColor: colors.gold,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },

  // Emoji icon
  emojiWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiWrapSelected: {
    backgroundColor: `${colors.gold}22`,
  },

  // Text block
  optionBody: {
    flex: 1,
    gap: 2,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  optionTitleSelected: {
    color: colors.textPrimary,
  },
  optionTags: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  optionTagsSelected: {
    color: colors.textSecondary,
  },
  optionId: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  optionIdSelected: {
    color: colors.textMuted,
  },

  // AI badge inside card
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.gold,
    borderRadius: borderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  aiBadgeSelected: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.bgBase,
    letterSpacing: 0.2,
  },
  aiBadgeTextSelected: {
    color: colors.gold,
  },

  // Check indicator
  checkWrap: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkActive: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIdle: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
  },

  // Auto-assign
  autoAssignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginBottom: spacing.lg,
  },
  autoAssignText: {
    ...typography.body,
    color: colors.textMuted,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    backgroundColor: colors.bgBase,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
