import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

/** Step 1 is now merged into step 2. Redirect immediately. */
export default function Step1Date() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/booking/${restaurantId}/step2-time`);
  }, [restaurantId]);

  return null;
}
