export function getStripeEnv(): { publishableKey: string } {
  return {
    publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
  };
}

export function isStripeConfigured(): boolean {
  return Boolean(getStripeEnv().publishableKey);
}
