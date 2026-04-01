import { Redirect } from 'expo-router';

/** Orders list merged into Activity; detail routes remain under /orders/[id]. */
export default function OrdersIndexRedirect() {
  return <Redirect href="/(customer)/activity" />;
}
