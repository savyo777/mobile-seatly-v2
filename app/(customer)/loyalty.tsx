import { Redirect } from 'expo-router';
import { isLoyaltyEnabled } from '@/lib/config/loyaltyFeature';

/** Legacy path: loyalty lives under Profile. When loyalty is disabled, bounce
 *  any stale deep-links to the profile root instead of the loyalty screen. */
export default function LoyaltyRedirect() {
  if (!isLoyaltyEnabled()) {
    return <Redirect href="/(customer)/profile" />;
  }
  return <Redirect href="/(customer)/profile/loyalty" />;
}
