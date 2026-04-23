import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, createStyles, spacing } from '@/lib/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type RightIcon = IoniconName;

type Props = {
  title: string;
  subtitle?: string;
  /** Tiny label above title — e.g. a business name or section kicker. */
  kicker?: string;
  rightIcon?: RightIcon;
  onRightPress?: () => void;
  accessibilityLabelRight?: string;
  /** Optional right-side badge count (notifications). */
  rightBadgeCount?: number;
};

// Mirrors diner profile/index.tsx topBar style throughout
const useStyles = createStyles((c) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  textCol: {
    flex: 1,
    paddingRight: spacing.md,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textMuted,
    marginBottom: 2,
  },
  // 28/800, -0.5 — matches diner headline exactly
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.5,
  },
  // 13/normal, textMuted — matches diner subline exactly
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: c.textMuted,
  },
  // 38×38, bgElevated — matches diner settingsBtn exactly
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  pressed: { opacity: 0.7 },
  badgeCount: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: c.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
}));

export function OwnerHeader({
  title,
  subtitle,
  kicker,
  rightIcon = 'settings-outline',
  onRightPress,
  accessibilityLabelRight = 'Open settings',
  rightBadgeCount,
}: Props) {
  const c = useColors();
  const styles = useStyles();

  return (
    <View style={styles.row}>
      <View style={styles.textCol}>
        {kicker ? (
          <Text style={styles.kicker} numberOfLines={1}>
            {kicker}
          </Text>
        ) : null}
        <Text style={styles.title} allowFontScaling numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {onRightPress ? (
        <Pressable
          onPress={onRightPress}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabelRight}
          hitSlop={8}
        >
          <Ionicons name={rightIcon} size={18} color={c.textPrimary} />
          {rightBadgeCount && rightBadgeCount > 0 ? (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>
                {rightBadgeCount > 9 ? '9+' : rightBadgeCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}
