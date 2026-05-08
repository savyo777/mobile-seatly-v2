import { Alert } from 'react-native';
import type { Href } from 'expo-router';

export const FALLBACK_ROUTES = {
  root: '/' as Href,
  auth: '/(auth)/welcome' as Href,
  customer: '/(customer)/discover' as Href,
  staff: '/(staff)/home' as Href,
} as const;

export type SafeRouter = {
  push: (href: Href) => void;
  replace: (href: Href) => void;
  back?: () => void;
  canGoBack?: () => boolean;
};

export type SafeNavigationOptions = {
  fallback?: Href;
  alert?: boolean;
  context?: string;
};

function recoverWithReplace(
  router: Pick<SafeRouter, 'replace'>,
  fallback: Href,
  context: string,
): void {
  try {
    router.replace(fallback);
  } catch (error) {
    console.error('[Navigation] fallback failed', { context, fallback, error });
  }
}

function notifyNavigationRecovered(showAlert: boolean): void {
  if (!showAlert) return;
  Alert.alert('Unable to open screen', 'The app recovered. Please try again.');
}

export function safePush(router: SafeRouter, href: Href, options: SafeNavigationOptions = {}): void {
  const fallback = options.fallback ?? FALLBACK_ROUTES.customer;
  const context = options.context ?? 'push';
  try {
    router.push(href);
  } catch (error) {
    console.error('[Navigation] push recovered', { context, href, error });
    recoverWithReplace(router, fallback, context);
    notifyNavigationRecovered(options.alert !== false);
  }
}

export function safeReplace(router: SafeRouter, href: Href, options: SafeNavigationOptions = {}): void {
  const fallback = options.fallback ?? FALLBACK_ROUTES.customer;
  const context = options.context ?? 'replace';
  try {
    router.replace(href);
  } catch (error) {
    console.error('[Navigation] replace recovered', { context, href, error });
    recoverWithReplace(router, fallback, context);
    notifyNavigationRecovered(options.alert !== false);
  }
}

export function safeBack(router: SafeRouter, options: SafeNavigationOptions = {}): void {
  const fallback = options.fallback ?? FALLBACK_ROUTES.customer;
  const context = options.context ?? 'back';
  try {
    if (router.canGoBack?.()) {
      router.back?.();
      return;
    }
  } catch (error) {
    console.error('[Navigation] back recovered', { context, error });
  }

  recoverWithReplace(router, fallback, context);
}

export function safeAsyncAction(
  action: () => Promise<unknown>,
  context: string,
  onError?: (error: unknown) => void,
): void {
  void action().catch((error) => {
    console.error('[Action] async action recovered', { context, error });
    onError?.(error);
  });
}
