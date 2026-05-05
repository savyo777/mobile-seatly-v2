import type { Href } from 'expo-router';
import { Easing } from 'react-native';

type SafeBackRouter = {
  back: () => void;
  canGoBack: () => boolean;
  replace: (href: Href) => void;
};

type StackTransitionOptions = {
  headerShown: false;
  contentStyle: { backgroundColor: string };
  animation: 'slide_from_right';
  gestureEnabled: true;
  fullScreenGestureEnabled?: true;
};

type TabTransitionOptions = {
  animation: 'fade';
  transitionSpec: {
    animation: 'timing';
    config: {
      duration: number;
      easing: (value: number) => number;
    };
  };
};

export function safeRouterBack(router: SafeBackRouter, fallback: Href) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}

export function createStackTransitionOptions(backgroundColor: string): StackTransitionOptions {
  return {
    headerShown: false,
    contentStyle: { backgroundColor },
    animation: 'slide_from_right',
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
  };
}

export function createTransparentStackTransitionOptions(): StackTransitionOptions {
  return {
    headerShown: false,
    contentStyle: { backgroundColor: 'transparent' },
    animation: 'slide_from_right',
    gestureEnabled: true,
  };
}

export const tabTransitionOptions: TabTransitionOptions = {
  animation: 'fade',
  transitionSpec: {
    animation: 'timing',
    config: {
      duration: 135,
      easing: Easing.out(Easing.cubic),
    },
  },
};
