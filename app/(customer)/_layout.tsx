import React, { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Tabs, useRouter, usePathname, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AiChatFab } from '@/components/ai/AiChatFab';
import { ShellErrorBoundary } from '@/components/ui/ShellErrorBoundary';
import { useColors, createStyles } from '@/lib/theme';
import { useAuthSession } from '@/lib/auth/AuthContext';

const HIDE_FAB_ROUTES = ['/ai-chat', '/post-review', '/camera', '/booking', '/checkout', '/register-restaurant'];

const useStyles = createStyles((c) => ({
  root: {
    flex: 1,
    backgroundColor: c.bgBase,
  },
  centerBtnWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  centerBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: c.gold,
    shadowColor: c.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  centerBtnActive: {
    backgroundColor: c.gold,
    borderColor: c.gold,
    shadowColor: c.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
}));

export default function CustomerTabsLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { loading, isAuthenticated, role } = useAuthSession();

  const hideTabChrome = HIDE_FAB_ROUTES.some((route) => pathname?.includes(route));
  // Tab bar = ~56pt of touch chrome stacked over the device's bottom safe-area
  // inset (home-indicator height). Without paddingBottom the labels render
  // under the indicator and get clipped, especially on Android where the
  // gesture bar gives no automatic inset.
  const tabBarPaddingBottom = Math.max(insets.bottom, 8);
  const tabBarStyle = useMemo(
    () =>
      hideTabChrome
        ? ({ display: 'none' } as const)
        : {
            backgroundColor: c.bgBase,
            borderTopColor: c.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            paddingTop: 6,
            paddingBottom: tabBarPaddingBottom,
            height: 56 + tabBarPaddingBottom,
          },
    [c.bgBase, c.border, hideTabChrome, tabBarPaddingBottom],
  );
  const screenOptions = useMemo(
    () => ({
      animation: 'shift' as const,
      lazy: true,
      freezeOnBlur: false,
      popToTopOnBlur: false,
      headerShown: false,
      sceneStyle: { backgroundColor: c.bgBase },
      tabBarActiveTintColor: c.gold,
      tabBarInactiveTintColor: c.textMuted,
      tabBarHideOnKeyboard: true,
      tabBarStyle,
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600' as const,
        marginBottom: 0,
      },
    }),
    [c.bgBase, c.gold, c.textMuted, tabBarStyle],
  );
  const eagerTabOptions = useMemo(() => ({ lazy: false }), []);

  useEffect(() => {
    if (loading || !isAuthenticated) return undefined;
    const timer = setTimeout(() => {
      router.prefetch('/(customer)/events' as Href);
      router.prefetch('/(customer)/activity' as Href);
      router.prefetch('/(customer)/profile' as Href);
    }, 250);
    return () => clearTimeout(timer);
  }, [isAuthenticated, loading, router]);

  const renderPostButton = useCallback(
    () => (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          router.push('/(customer)/discover/post-review/camera' as Href);
        }}
        style={styles.centerBtnWrapper}
        accessibilityLabel="Open snap camera"
      >
        {({ pressed }) => (
          <View style={[styles.centerBtn, pressed && styles.centerBtnActive]}>
            <Ionicons
              name="camera"
              size={28}
              color={c.bgBase}
            />
          </View>
        )}
      </Pressable>
    ),
    [c.bgBase, router, styles.centerBtn, styles.centerBtnActive, styles.centerBtnWrapper],
  );

  if (loading || !isAuthenticated || role === null) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={c.gold} />
      </View>
    );
  }

  return (
    <ShellErrorBoundary fallbackHref="/(customer)/discover">
      <View style={styles.root}>
        <Tabs detachInactiveScreens={false} screenOptions={screenOptions}>
          <Tabs.Screen
            name="discover"
            options={{
              ...eagerTabOptions,
              title: t('tabs.discover'),
              tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="events"
            options={{
              ...eagerTabOptions,
              title: 'Events',
              tabBarIcon: ({ color, size }) => <Ionicons name="ticket-outline" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="post"
            options={{
              ...eagerTabOptions,
              title: '',
              tabBarLabel: () => null,
              tabBarButton: renderPostButton,
            }}
          />
          <Tabs.Screen
            name="activity"
            options={{
              ...eagerTabOptions,
              title: 'Bookings',
              tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              ...eagerTabOptions,
              title: t('tabs.profile'),
              tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
            }}
          />
          <Tabs.Screen name="feed" options={{ href: null }} />
          <Tabs.Screen name="map" options={{ href: null }} />
          <Tabs.Screen name="index" options={{ href: null }} />
          <Tabs.Screen name="bookings" options={{ href: null }} />
          <Tabs.Screen name="orders" options={{ href: null }} />
          <Tabs.Screen name="checkout/[orderId]" options={{ href: null }} />
          <Tabs.Screen name="loyalty" options={{ href: null }} />
          <Tabs.Screen name="ai-chat" options={{ href: null }} />
          <Tabs.Screen name="notifications" options={{ href: null }} />
          <Tabs.Screen name="post/camera" options={{ href: null }} />
          <Tabs.Screen name="post/caption" options={{ href: null }} />
          <Tabs.Screen name="post/reward" options={{ href: null }} />
        </Tabs>
        {!hideTabChrome ? <AiChatFab bottomOffset={56 + tabBarPaddingBottom + 16} /> : null}
      </View>
    </ShellErrorBoundary>
  );
}
