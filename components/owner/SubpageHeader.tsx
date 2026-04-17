import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Href, useNavigation, useRouter } from 'expo-router';
import { ownerColors, ownerRadii, ownerSpace } from '@/lib/theme/ownerTheme';

type RootFallbackTab = 'home' | 'reservations' | 'floor' | 'menu' | 'more';

type SubpageHeaderProps = {
  title: string;
  subtitle?: string;
  fallbackTab?: RootFallbackTab;
  fallbackHref?: Href;
  rightAction?: React.ReactNode;
};

const FALLBACK_TAB_HREF: Record<RootFallbackTab, Href> = {
  home: '/(staff)/home',
  reservations: '/(staff)/reservations',
  floor: '/(staff)/floor',
  menu: '/(staff)/menu',
  more: '/(staff)/more',
};

export function SubpageHeader({
  title,
  subtitle,
  fallbackTab = 'more',
  fallbackHref,
  rightAction,
}: SubpageHeaderProps) {
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
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={20} color={ownerColors.text} />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.rightSlot}>{rightAction}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: ownerSpace.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ownerSpace.sm,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  backBtnPressed: {
    opacity: 0.88,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: ownerColors.text,
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '500',
    color: ownerColors.textMuted,
  },
  rightSlot: {
    minWidth: 34,
    minHeight: 34,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
