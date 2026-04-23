import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Href, useNavigation, useRouter } from 'expo-router';
import { createStyles, borderRadius, spacing, useColors } from '@/lib/theme';

type RootFallbackTab = 'home' | 'reservations' | 'floor' | 'menu' | 'more';

type SubpageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Tighter typography and spacing (e.g. schedule). */
  compact?: boolean;
  /** Extra right padding when multiple icons sit in the header (e.g. + calendar settings). */
  wideRightAction?: boolean;
  fallbackTab?: RootFallbackTab;
  fallbackHref?: Href;
  rightAction?: React.ReactNode;
};

const FALLBACK_TAB_HREF: Record<RootFallbackTab, Href> = {
  home: '/(staff)/home',
  reservations: '/(staff)/reservations',
  floor: '/(staff)/floor',
  menu: '/(staff)/menu',
  more: '/(staff)/profile',
};

export function SubpageHeader({
  title,
  subtitle,
  compact = false,
  wideRightAction = false,
  fallbackTab = 'more',
  fallbackHref,
  rightAction,
}: SubpageHeaderProps) {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const navigation = useNavigation();
  const safeFallbackHref = fallbackHref ?? FALLBACK_TAB_HREF[fallbackTab];

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    router.replace(safeFallbackHref);
  }, [navigation, router, safeFallbackHref]);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.row}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={20} color={c.textPrimary} />
        </Pressable>
        <View
          style={[
            styles.titleWrap,
            rightAction ? (wideRightAction ? styles.titleWrapWithRightIconsWide : styles.titleWrapWithRightIcons) : null,
          ]}
        >
          <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, compact && styles.subtitleCompact]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {!rightAction ? <View style={styles.rightSpacer} /> : null}
      </View>
      {rightAction ? (
        <View style={styles.headerRightAbs} pointerEvents="box-none">
          <View style={styles.headerRightRow}>{rightAction}</View>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = createStyles((c) => ({
  wrap: {
    marginBottom: spacing.sm,
    position: 'relative',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  wrapCompact: {
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    width: '100%',
    maxWidth: '100%',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  backBtnPressed: {
    opacity: 0.7,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  titleWrapWithRightIcons: {
    paddingRight: 118,
  },
  titleWrapWithRightIconsWide: {
    paddingRight: 188,
  },
  rightSpacer: {
    width: 36,
    minHeight: 36,
  },
  headerRightAbs: {
    position: 'absolute',
    right: 16,
    top: 2,
    zIndex: 2,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.5,
  },
  titleCompact: {
    fontSize: 22,
    letterSpacing: -0.35,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
    color: c.textMuted,
  },
  subtitleCompact: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
  },
}));
