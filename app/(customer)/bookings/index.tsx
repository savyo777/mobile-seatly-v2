import { Redirect } from 'expo-router';

/** Bookings list merged into Activity; detail routes remain under /bookings/[id]. */
export default function BookingsIndexRedirect() {
  return <Redirect href="/(customer)/activity" />;
}
