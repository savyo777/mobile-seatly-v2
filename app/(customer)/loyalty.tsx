import { Redirect } from 'expo-router';

/** Legacy path: loyalty lives under Profile. */
export default function LoyaltyRedirect() {
  return <Redirect href="/(customer)/profile/loyalty" />;
}
