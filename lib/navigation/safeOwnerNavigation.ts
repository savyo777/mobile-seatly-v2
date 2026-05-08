import type { Href } from 'expo-router';
import { FALLBACK_ROUTES, safePush, type SafeRouter } from './safeNavigation';

export function safeOwnerPush(
  router: SafeRouter,
  href: Href,
  fallback: Href = FALLBACK_ROUTES.staff,
): void {
  safePush(router, href, { fallback, context: 'owner' });
}
