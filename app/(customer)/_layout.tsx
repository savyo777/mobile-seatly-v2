import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Tabs, useRouter, usePathname, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { AiChatFab } from '@/components/ai/AiChatFab';
import { colors } from '@/lib/theme';

const HIDE_FAB_ROUTES = ['/ai-chat', '/post-review', '/camera', '/booking'];

export default function CustomerTabsLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();

  const hideFab = HIDE_FAB_ROUTES.some((route) => pathname?.includes(route));

  return (
    <View style={styles.root}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textMuted,
        // Do not set height or paddingBottom here — they override React Navigation's
        // default tab bar sizing and safe-area bottom inset (see BottomTabBar).
        tabBarStyle: hideFab ? { display: 'none' } : {
          backgroundColor: colors.bgBase,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 0,
        },
        // Default tab layout is flex-start, which leaves a gap above the home indicator.
        // Nudge items down so the row sits lower without overriding safe-area paddingBottom.
        tabBarItemStyle: {
          transform: [{ translateY: 10 }],
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: t('tabs.discover'),
          tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => <Ionicons name="images-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarButton: () => (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
                    color={colors.bgBase}
                  />
                </View>
              )}
            </Pressable>
          ),
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
      <Tabs.Screen name="map" options={{ href: null }} />
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="bookings" options={{ href: null }} />
      <Tabs.Screen name="orders" options={{ href: null }} />
      <Tabs.Screen name="loyalty" options={{ href: null }} />
      <Tabs.Screen name="ai-chat" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="post/camera" options={{ href: null }} />
      <Tabs.Screen name="post/caption" options={{ href: null }} />
      <Tabs.Screen name="post/reward" options={{ href: null }} />
    </Tabs>
      {!hideFab ? <AiChatFab bottomOffset={100} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBase,
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
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  centerBtnActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
