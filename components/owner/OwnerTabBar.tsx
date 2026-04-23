import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, { active: IoniconName; inactive: IoniconName; label: string }> = {
  home:         { active: 'home',         inactive: 'home-outline',         label: 'Home' },
  reservations: { active: 'calendar',     inactive: 'calendar-outline',     label: 'Bookings' },
  schedule:     { active: 'time',         inactive: 'time-outline',         label: 'Schedule' },
  profile:      { active: 'storefront',   inactive: 'storefront-outline',   label: 'Business' },
};

const QUICK_ACTIONS = [
  {
    id: 'booking',
    icon: 'calendar-outline' as IoniconName,
    label: 'New Booking',
    sub: 'Add a reservation for a guest',
    route: '/(staff)/reservations',
  },
  {
    id: 'walkin',
    icon: 'person-add-outline' as IoniconName,
    label: 'Walk-in / Waitlist',
    sub: 'Add a guest to the waiting list',
    route: '/(staff)/waitlist',
  },
  {
    id: 'promo',
    icon: 'pricetag-outline' as IoniconName,
    label: 'Create Promotion',
    sub: 'Launch a new deal or offer',
    route: '/(staff)/promotions/new',
  },
] as const;

const useStyles = createStyles((c) => ({
  outer: {
    position: 'relative',
    overflow: 'visible',
  },
  topHairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 10,
    position: 'relative',
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 3,
    minHeight: 56,
    paddingTop: 6,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  labelInactive: {
    opacity: 0.55,
    fontWeight: '600',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.gold,
    marginTop: 3,
  },
  plusSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  plusWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    backgroundColor: c.bgBase,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: c.gold,
        shadowOpacity: 0.35,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 10 },
    }),
  },
  plusButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  plusPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.94,
  },

  // Quick-add sheet
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: c.bgSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
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
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  sheetSub: {
    fontSize: 13,
    color: c.textMuted,
    fontWeight: '500',
    marginBottom: spacing.lg,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 64,
  },
  actionItemPressed: {
    opacity: 0.8,
    backgroundColor: c.bgElevated,
    borderRadius: borderRadius.lg,
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  actionItemDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: `${c.gold}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionTextCol: {
    flex: 1,
    gap: 2,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.2,
  },
  actionSub: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: '500',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textMuted,
  },
}));

type Props = BottomTabBarProps;
const VISIBLE_ORDER = ['home', 'reservations', 'schedule', 'profile'] as const;

export function OwnerTabBar({ state, navigation }: Props) {
  const c = useColors();
  const { effective } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  const visibleRoutes = VISIBLE_ORDER.map((name) =>
    state.routes.find((r) => r.name === name),
  ).filter((r): r is (typeof state.routes)[number] => !!r);

  const handlePlus = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    setSheetOpen(true);
  };

  const handleAction = (route: string) => {
    setSheetOpen(false);
    setTimeout(() => router.push(route as never), 150);
  };

  const renderSlot = (routeName: string) => {
    const route = visibleRoutes.find((r) => r.name === routeName);
    if (!route) return <View style={styles.slot} key={`ph-${routeName}`} />;
    const meta = ICONS[routeName] ?? {
      active: 'ellipse',
      inactive: 'ellipse-outline',
      label: routeName,
    };
    const isFocused = state.routes[state.index]?.name === route.name;

    const onPress = () => {
      if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {});
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name as never);
      }
    };

    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={meta.label}
        hitSlop={12}
        onPress={onPress}
        style={({ pressed }) => [styles.slot, pressed && styles.pressed]}
      >
        <Ionicons
          name={isFocused ? meta.active : meta.inactive}
          size={22}
          color={isFocused ? c.gold : c.textMuted}
        />
        <Text
          style={[
            styles.label,
            { color: isFocused ? c.gold : c.textMuted },
            !isFocused && styles.labelInactive,
          ]}
          numberOfLines={1}
        >
          {meta.label}
        </Text>
        <View style={[styles.activeDot, { opacity: isFocused ? 1 : 0 }]} />
      </Pressable>
    );
  };

  return (
    <>
      <View style={styles.outer}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={effective === 'dark' ? 60 : 90}
            tint={effective === 'dark' ? 'dark' : 'light'}
            style={styles.bg}
          />
        ) : (
          <View
            style={[
              styles.bg,
              {
                backgroundColor:
                  effective === 'dark' ? 'rgba(10,10,10,0.96)' : 'rgba(255,255,255,0.98)',
              },
            ]}
          />
        )}
        <View style={styles.topHairline} />
        <View style={[styles.row, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {renderSlot('home')}
          {renderSlot('reservations')}

          <View style={styles.plusSlot}>
            <View style={styles.plusWrapper}>
              <Pressable
                onPress={handlePlus}
                accessibilityRole="button"
                accessibilityLabel="Quick actions"
                accessibilityHint="Add a booking, walk-in, or promotion"
                hitSlop={16}
                style={({ pressed }) => [styles.plusButton, pressed && styles.plusPressed]}
              >
                <LinearGradient
                  colors={[c.gold, c.goldDark] as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <Ionicons name="add" size={30} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {renderSlot('schedule')}
          {renderSlot('profile')}
        </View>
      </View>

      {/* Quick-add sheet */}
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
              <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
                <View style={styles.sheetGrab} />
                <Text style={styles.sheetTitle}>What would you like to do?</Text>
                <Text style={styles.sheetSub}>Choose an action to get started</Text>

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
                  accessibilityLabel="Cancel"
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}
