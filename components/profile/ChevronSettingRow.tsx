import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChevronGlyph } from '@/components/ui/ChevronGlyph';
import { useColors, createStyles, spacing, typography } from '@/lib/theme';

type Props = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
  showChevron?: boolean;
  isLast?: boolean;
  /** Softer icon treatment (e.g. account hub lists) */
  iconMuted?: boolean;
};

const useStyles = createStyles((c) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  pressed: {
    backgroundColor: c.bgElevated,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '600',
  },
  titleDestructive: {
    color: c.danger,
  },
  subtitle: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: 4,
  },
}));

export function ChevronSettingRow({
  title,
  subtitle,
  icon,
  onPress,
  destructive,
  showChevron = true,
  isLast,
  iconMuted,
}: Props) {
  const c = useColors();
  const styles = useStyles();
  const iconColor = destructive ? c.danger : c.gold;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !isLast && styles.rowBorder, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      {icon ? (
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
      ) : null}
      <View style={styles.textWrap}>
        <Text style={[styles.title, destructive && styles.titleDestructive]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {showChevron ? <ChevronGlyph color={c.textMuted} size={18} /> : null}
    </Pressable>
  );
}
