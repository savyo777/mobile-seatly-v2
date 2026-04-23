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
  // Section header — mirrors DiscoverHorizontalSection exactly
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  // 18/800 title matching diner section titles
  sectionLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.3,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.gold,
  },
  actionPressed: { opacity: 0.65 },
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
              <Ionicons name="chevron-forward" size={14} color={c.gold} />
            </Pressable>
          ) : null}
        </View>
      )}
      {bare ? children : <View style={styles.card}>{children}</View>}
    </View>
  );
}
