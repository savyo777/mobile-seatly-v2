export function isDemoModeEnabled(): boolean {
  return process.env.EXPO_PUBLIC_CENAIVA_DEMO_MODE === 'true';
}
