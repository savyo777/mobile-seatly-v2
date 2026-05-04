import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

export function createStackTransitionOptions(backgroundColor: string): NativeStackNavigationOptions {
  return {
    headerShown: false,
    contentStyle: { backgroundColor },
    animation: 'slide_from_right',
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
  };
}

export function createTransparentStackTransitionOptions(): NativeStackNavigationOptions {
  return {
    headerShown: false,
    contentStyle: { backgroundColor: 'transparent' },
    animation: 'slide_from_right',
    gestureEnabled: true,
  };
}

export const tabTransitionOptions: Pick<
  BottomTabNavigationOptions,
  'animation' | 'transitionSpec'
> = {
  animation: 'none',
};
