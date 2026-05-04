import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Redirect, Tabs, useRouter, usePathname, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { AiChatFab } from '@/components/ai/AiChatFab';
import { useColors, createStyles } from '@/lib/theme';
import { tabTransitionOptions } from '@/lib/navigation/transitions';
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
  const { loading, isAuthenticated, role } = useAuthSession();

  const hideTabChrome = HIDE_FAB_ROUTES.some((route) => pathname?.includes(route));
  const tabBarStyle = useMemo(
    () =>
      hideTabChrome
        ? ({ display: 'none' } as const)
        : {
            backgroundColor: c.bgBase,
            borderTopColor: c.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            paddingTop: 0,
          },
    [c.bgBase, c.border, hideTabChrome],
  );
  const screenOptions = useMemo(
    () => ({
      ...tabTransitionOptions,
      lazy: true,
      freezeOnBlur: true,
      popToTopOnBlur: false,
      headerShown: false,
      sceneStyle: { backgroundColor: c.bgBase },
      tabBarActiveTintColor: c.gold,
      tabBarInactiveTintColor: c.textMuted,
      tabBarHideOnKeyboard: true,
      tabBarStyle,
      tabBarItemStyle: {
        transform: [{ translateY: 10 }],
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600' as const,
        marginBottom: 0,
      },
    }),
    [c.bgBase, c.gold, c.textMuted, tabBarStyle],
  );
  const renderPostButton = useCallback(
    () => (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          router.push('/(customer)/discover/post-review' as Href);
        }}
        style={styles.centerBtnWrapper}
        accessibilityLabel="Post food"
      >
        {({ pressed }) => (
          <View style={[styles.centerBtn, pressed && styles.centerBtnActive]}>
            <Ionicons
              name="add"
              size={30}
              color={c.bgBase}
            />
          </View>
        )}
      </Pressable>
    ),
    [c.bgBase, router, styles.centerBtn, styles.centerBtnActive, styles.centerBtnWrapper],
  );

  if (loading || (isAuthenticated && role === null)) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={c.gold} />
      </View>
    );
  }
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <View style={styles.root}>
    <Tabs
      detachInactiveScreens
      screenOptions={screenOptions}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: t('tabs.discover'),
          tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }) => <Ionicons name="ticket-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarButton: renderPostButton,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
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
      {!hideTabChrome ? <AiChatFab bottomOffset={100} /> : null}
    </View>
  );
}
