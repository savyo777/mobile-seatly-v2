import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useColors, createStyles } from '@/lib/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, { active: IoniconName; inactive: IoniconName; label: string }> = {
  home: { active: 'home', inactive: 'home-outline', label: 'Home' },
  reservations: { active: 'calendar', inactive: 'calendar-outline', label: 'Reservations' },
  schedule: { active: 'time', inactive: 'time-outline', label: 'Schedule' },
  profile: { active: 'storefront', inactive: 'storefront-outline', label: 'Profile' },
};

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
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelInactive: {
    opacity: 0.6,
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
}));

type Props = BottomTabBarProps & {
  onPlusPress?: () => void;
};

const VISIBLE_ORDER = ['home', 'reservations', 'schedule', 'profile'] as const;

export function OwnerTabBar({ state, navigation, onPlusPress }: Props) {
  const c = useColors();
  const { effective } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const visibleRoutes = VISIBLE_ORDER.map((name) =>
    state.routes.find((r) => r.name === name),
  ).filter((r): r is (typeof state.routes)[number] => !!r);

  const handlePlus = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    if (onPlusPress) {
      onPlusPress();
      return;
    }
    router.push('/(staff)/promotions/new' as never);
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
      if (Platform.OS === 'ios') {
        Haptics.selectionAsync().catch(() => {});
      }
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
            { backgroundColor: effective === 'dark' ? 'rgba(10,10,10,0.96)' : 'rgba(255,255,255,0.98)' },
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
              accessibilityLabel="Create new promotion"
              accessibilityHint="Opens the promotion editor"
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
  );
}
