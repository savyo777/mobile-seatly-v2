import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChevronGlyph } from '@/components/ui/ChevronGlyph';
import { colors, spacing, typography } from '@/lib/theme';

type Props = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
  showChevron?: boolean;
  isLast?: boolean;
};

export function ChevronSettingRow({
  title,
  subtitle,
  icon,
  onPress,
  destructive,
  showChevron = true,
  isLast,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !isLast && styles.rowBorder, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      {icon ? (
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={20} color={destructive ? '#E8A0A0' : colors.gold} />
        </View>
      ) : null}
      <View style={styles.textWrap}>
        <Text style={[styles.title, destructive && styles.titleDestructive]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {showChevron ? <ChevronGlyph color={colors.textMuted} size={18} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.bgElevated,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  titleDestructive: {
    color: '#E8A0A0',
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 4,
  },
});
