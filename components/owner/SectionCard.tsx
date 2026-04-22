import React from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createStyles, spacing, borderRadius, useColors } from '@/lib/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type Props = {
  /** Uppercase section heading above the card. */
  sectionTitle?: string;
  /** Optional icon shown next to the section title. */
  icon?: IoniconName;
  /** Optional small action on the right of the title (e.g. "See all"). */
  actionLabel?: string;
  onActionPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  /** Extra bottom margin after block. */
  marginBottom?: number;
  /** Remove the card frame and render children flat (for custom content). */
  bare?: boolean;
};

const useStyles = createStyles((c) => ({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: c.gold,
    letterSpacing: 0.2,
  },
  actionPressed: {
    opacity: 0.6,
  },
  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
}));

export function SectionCard({
  sectionTitle,
  icon,
  actionLabel,
  onActionPress,
  children,
  style,
  marginBottom = spacing.md,
  bare = false,
}: Props) {
  const c = useColors();
  const styles = useStyles();

  return (
    <View style={[{ marginBottom }, style]}>
      {(sectionTitle || actionLabel) && (
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {icon ? <Ionicons name={icon} size={13} color={c.textMuted} /> : null}
            {sectionTitle ? (
              <Text style={styles.sectionLabel} numberOfLines={1}>
                {sectionTitle}
              </Text>
            ) : null}
          </View>
          {actionLabel && onActionPress ? (
            <Pressable
              onPress={onActionPress}
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
              accessibilityRole="button"
              accessibilityLabel={actionLabel}
              hitSlop={8}
            >
              <Text style={styles.actionLabel}>{actionLabel}</Text>
              <Ionicons name="chevron-forward" size={13} color={c.gold} />
            </Pressable>
          ) : null}
        </View>
      )}
      {bare ? children : <View style={styles.card}>{children}</View>}
    </View>
  );
}
