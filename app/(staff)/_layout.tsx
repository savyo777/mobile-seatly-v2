import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const QUICK_ACTIONS: { id: string; icon: IoniconName; label: string; sub: string; route: string }[] = [
  {
    id: 'booking',
    icon: 'calendar-outline',
    label: 'New Booking',
    sub: 'Add a reservation for a guest',
    route: '/(staff)/reservations',
  },
  {
    id: 'walkin',
    icon: 'person-add-outline',
    label: 'Walk-in / Waitlist',
    sub: 'Add a guest to the waiting list',
    route: '/(staff)/waitlist',
  },
  {
    id: 'promo',
    icon: 'pricetag-outline',
    label: 'Create Promotion',
    sub: 'Launch a new deal or offer',
    route: '/(staff)/promotions/new',
  },
];

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },
  // Center button — mirrors diner exactly
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
  centerBtnPressed: {
    shadowOpacity: 0.5,
    transform: [{ scale: 0.96 }],
  },
  // Quick-add modal sheet
  overlay: { flex: 1, justifyContent: 'flex-end' },
  overlayDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  sheet: {
    backgroundColor: c.bgSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  sheetGrab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.4,
    marginBottom: spacing.lg,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 68,
  },
  actionItemPressed: { opacity: 0.75 },
  actionItemDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    flexShrink: 0,
  },
  actionTextCol: { flex: 1, gap: 2 },
  actionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.2,
  },
  actionSub: { fontSize: 13, color: c.textMuted, fontWeight: '500' },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    marginTop: spacing.sm,
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: c.textMuted },
}));

export default function OwnerTabsLayout() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleCenter = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSheetOpen(true);
  };

  const handleAction = (route: string) => {
    setSheetOpen(false);
    setTimeout(() => router.push(route as never), 180);
  };

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: c.bgBase },
          tabBarActiveTintColor: c.gold,
          tabBarInactiveTintColor: c.textMuted,
          tabBarStyle: {
            backgroundColor: c.bgBase,
            borderTopColor: c.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            paddingTop: 0,
          },
          // mirrors the diner side nudge
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
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="reservations"
          options={{
            title: 'Bookings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" size={size} color={color} />
            ),
          }}
        />

        {/* Center quick-add button — mirrors the diner "post" tab exactly */}
        <Tabs.Screen
          name="promote"
          options={{
            title: '',
            tabBarLabel: () => null,
            tabBarButton: () => (
              <Pressable
                onPress={handleCenter}
                style={styles.centerBtnWrapper}
                accessibilityRole="button"
                accessibilityLabel="Quick actions"
                accessibilityHint="Add a booking, walk-in, or promotion"
              >
                {({ pressed }) => (
                  <View style={[styles.centerBtn, pressed && styles.centerBtnPressed]}>
                    <Ionicons name="add" size={30} color={c.bgBase} />
                  </View>
                )}
              </Pressable>
            ),
          }}
        />

        <Tabs.Screen
          name="schedule"
          options={{
            title: 'Schedule',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Business',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="storefront-outline" size={size} color={color} />
            ),
          }}
        />

        {/* Hidden routes — accessible via router.push only */}
        <Tabs.Screen name="promotions" options={{ href: null }} />
        <Tabs.Screen name="analytics"  options={{ href: null }} />
        <Tabs.Screen name="guests"     options={{ href: null }} />
        <Tabs.Screen name="staff"      options={{ href: null }} />
        <Tabs.Screen name="floor"      options={{ href: null }} />
        <Tabs.Screen name="menu"       options={{ href: null }} />
        <Tabs.Screen name="waitlist"   options={{ href: null }} />
        <Tabs.Screen name="ordersKds"  options={{ href: null }} />
        <Tabs.Screen name="insights"   options={{ href: null }} />
        <Tabs.Screen name="business"   options={{ href: null }} />
        <Tabs.Screen name="ai"         options={{ href: null }} />
        <Tabs.Screen name="dashboard"  options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="index"      options={{ href: null }} />
        <Tabs.Screen name="crm"        options={{ href: null }} />
        <Tabs.Screen name="expenses"   options={{ href: null }} />
        <Tabs.Screen name="events"     options={{ href: null }} />
        <Tabs.Screen name="export"     options={{ href: null }} />
        <Tabs.Screen name="settings"   options={{ href: null, tabBarStyle: { display: 'none' } }} />
      </Tabs>

      {/* Quick-add modal sheet */}
      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetOpen(false)}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={() => setSheetOpen(false)}>
          <View style={styles.overlay}>
            <View style={styles.overlayDim} />
            <TouchableWithoutFeedback>
              <View
                style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
              >
                <View style={styles.sheetGrab} />
                <Text style={styles.sheetTitle}>Quick actions</Text>

                {QUICK_ACTIONS.map((action, i) => (
                  <Pressable
                    key={action.id}
                    onPress={() => handleAction(action.route)}
                    style={({ pressed }) => [
                      styles.actionItem,
                      i > 0 && styles.actionItemDivider,
                      pressed && styles.actionItemPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                  >
                    <View style={styles.actionIconCircle}>
                      <Ionicons name={action.icon} size={22} color={c.gold} />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={styles.actionLabel}>{action.label}</Text>
                      <Text style={styles.actionSub}>{action.sub}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
                  </Pressable>
                ))}

                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => setSheetOpen(false)}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
