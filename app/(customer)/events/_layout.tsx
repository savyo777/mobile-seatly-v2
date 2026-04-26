import { Stack } from 'expo-router';
import { useColors } from '@/lib/theme';
import { createStackTransitionOptions } from '@/lib/navigation/transitions';

export default function EventsLayout() {
  const c = useColors();
  return (
    <Stack screenOptions={createStackTransitionOptions(c.bgBase)} />
  );
}
