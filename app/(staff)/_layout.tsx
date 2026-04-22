import React from 'react';
import { Tabs } from 'expo-router';
import { useColors } from '@/lib/theme';
import { OwnerTabBar } from '@/components/owner/OwnerTabBar';

export default function OwnerTabsLayout() {
  const c = useColors();

  return (
    <Tabs
      tabBar={(props) => <OwnerTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.bgBase },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="reservations" options={{ title: 'Reservations' }} />
      <Tabs.Screen name="schedule" options={{ title: 'Schedule' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />

      {/* Hidden routes — reachable via router.push only */}
      <Tabs.Screen name="promotions" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="guests" options={{ href: null }} />
      <Tabs.Screen name="staff" options={{ href: null }} />
      <Tabs.Screen name="floor" options={{ href: null }} />
      <Tabs.Screen name="menu" options={{ href: null }} />
      <Tabs.Screen name="waitlist" options={{ href: null }} />
      <Tabs.Screen name="ordersKds" options={{ href: null }} />
      <Tabs.Screen name="insights" options={{ href: null }} />
      <Tabs.Screen name="promote" options={{ href: null }} />
      <Tabs.Screen name="business" options={{ href: null }} />
      <Tabs.Screen name="ai" options={{ href: null }} />
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="crm" options={{ href: null }} />
      <Tabs.Screen name="expenses" options={{ href: null }} />
      <Tabs.Screen name="events" options={{ href: null }} />
      <Tabs.Screen name="export" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
