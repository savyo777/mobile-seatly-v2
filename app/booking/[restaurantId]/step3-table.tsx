import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors, createStyles } from '@/lib/theme';

const useStyles = createStyles((c) => ({
  container: {
    flex: 1,
    backgroundColor: c.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

/** Legacy route: table selection was removed; forward to preorder with auto-assigned table. */
export default function Step3TableRedirect() {
  const router = useRouter();
  const c = useColors();
  const styles = useStyles();
  const { restaurantId, date, time, partySize } = useLocalSearchParams<{
    restaurantId: string;
    date?: string;
    time?: string;
    partySize?: string;
  }>();

  useEffect(() => {
    if (!restaurantId) return;
    const d = encodeURIComponent(date ?? '');
    const tm = encodeURIComponent(time ?? '');
    const p = partySize ?? '2';
    router.replace(
      `/booking/${restaurantId}/step4-preorder?date=${d}&time=${tm}&partySize=${p}&tableId=auto`,
    );
  }, [restaurantId, date, time, partySize, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={c.gold} />
    </View>
  );
}
