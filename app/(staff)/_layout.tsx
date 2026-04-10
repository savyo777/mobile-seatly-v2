import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ownerColors } from '@/lib/theme/ownerTheme';

function TabIon({ name, focused }: { name: keyof typeof Ionicons.glyphMap; focused: boolean }) {
  return (
    <Ionicons name={name} size={24} color={focused ? ownerColors.gold : ownerColors.textMuted} />
  );
}

export default function StaffTabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ownerColors.gold,
        tabBarInactiveTintColor: ownerColors.textMuted,
        tabBarStyle: {
          backgroundColor: ownerColors.bg,
          borderTopColor: ownerColors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? 88 : 72,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('owner.tabHome'),
          tabBarIcon: ({ focused }) => <TabIon name="home-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: t('owner.tabReservations'),
          tabBarIcon: ({ focused }) => <TabIon name="calendar-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="floor"
        options={{
          title: t('owner.tabFloor'),
          tabBarIcon: ({ focused }) => <TabIon name="grid-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: t('owner.tabMenu'),
          tabBarIcon: ({ focused }) => <TabIon name="restaurant-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('owner.tabMore'),
          tabBarIcon: ({ focused }) => <TabIon name="ellipsis-horizontal" focused={focused} />,
        }}
      />

      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="ai" options={{ href: null }} />
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen name="schedule" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="waitlist" options={{ href: null }} />
      <Tabs.Screen name="ordersKds" options={{ href: null }} />
      <Tabs.Screen name="staff" options={{ href: null }} />
      <Tabs.Screen name="crm" options={{ href: null }} />
      <Tabs.Screen name="expenses" options={{ href: null }} />
      <Tabs.Screen name="events" options={{ href: null }} />
      <Tabs.Screen name="export" options={{ href: null }} />
      <Tabs.Screen name="promotions" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
