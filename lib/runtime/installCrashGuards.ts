import { Platform } from 'react-native';
import { router, type Href } from 'expo-router';
import { FALLBACK_ROUTES } from '@/lib/navigation/safeNavigation';
import { logCrash } from '@/lib/errors/crashLogger';

type ErrorUtilsLike = {
  getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
};

type CrashGuardOptions = {
  getFallbackHref?: () => Href;
};

let globalGuardInstalled = false;
let routerGuardInstalled = false;
let getFallbackHrefRef: (() => Href) | undefined;

function routeFallbackForPath(pathname: string | undefined): Href {
  if (!pathname) return FALLBACK_ROUTES.root;
  if (pathname.startsWith('/(staff)') || pathname.startsWith('/home') || pathname.startsWith('/profile')) {
    return FALLBACK_ROUTES.staff;
  }
  if (pathname.startsWith('/(auth)') || pathname.startsWith('/login') || pathname.startsWith('/register')) {
    return FALLBACK_ROUTES.auth;
  }
  if (pathname.startsWith('/(customer)') || pathname.startsWith('/discover') || pathname.startsWith('/activity')) {
    return FALLBACK_ROUTES.customer;
  }
  return FALLBACK_ROUTES.root;
}

function logRecoveredError(context: string, error: unknown, extra?: Record<string, unknown>): void {
  if (__DEV__) {
    console.error('[CrashGuard] recovered', {
      context,
      platform: Platform.OS,
      error,
      ...extra,
    });
  }
  // Fire-and-forget capture to the in-house crash_logs table. Never throws.
  void logCrash(error, { route: null, extra: { source: context, ...extra } });
}

export function getDefaultCrashFallback(pathname: string | undefined): Href {
  return routeFallbackForPath(pathname);
}

export function installGlobalCrashGuard(): void {
  if (globalGuardInstalled) return;
  globalGuardInstalled = true;

  const errorUtils = (globalThis as unknown as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  const previousHandler = errorUtils?.getGlobalHandler?.();
  errorUtils?.setGlobalHandler?.((error, isFatal) => {
    logRecoveredError('global-error', error, { isFatal });
    if (!isFatal) {
      previousHandler?.(error, isFatal);
    }
  });

  const maybeWindow = globalThis as unknown as {
    addEventListener?: (type: string, listener: (event: unknown) => void) => void;
  };
  maybeWindow.addEventListener?.('unhandledrejection', (event: unknown) => {
    const reason = (event as { reason?: unknown })?.reason ?? event;
    logRecoveredError('unhandled-rejection', reason);
  });
}

export function installRouterCrashGuard(options: CrashGuardOptions = {}): void {
  getFallbackHrefRef = options.getFallbackHref;
  if (routerGuardInstalled) return;
  routerGuardInstalled = true;

  const originalPush = router.push.bind(router);
  const originalReplace = router.replace.bind(router);
  const originalBack = router.back.bind(router);
  const originalCanGoBack = router.canGoBack.bind(router);
  const fallback = () => getFallbackHrefRef?.() ?? FALLBACK_ROUTES.root;

  const recover = (context: string, href: Href | null, error: unknown) => {
    const fallbackHref = fallback();
    logRecoveredError(context, error, { href, fallback: fallbackHref });
    try {
      originalReplace(fallbackHref);
    } catch (replaceError) {
      logRecoveredError(`${context}:fallback`, replaceError, { fallback: fallbackHref });
    }
  };

  router.push = ((href: Href, navOptions?: Parameters<typeof router.push>[1]) => {
    try {
      return originalPush(href, navOptions);
    } catch (error) {
      recover('router.push', href, error);
    }
  }) as typeof router.push;

  router.replace = ((href: Href, navOptions?: Parameters<typeof router.replace>[1]) => {
    try {
      return originalReplace(href, navOptions);
    } catch (error) {
      recover('router.replace', href, error);
    }
  }) as typeof router.replace;

  router.back = (() => {
    try {
      if (originalCanGoBack()) {
        return originalBack();
      }
    } catch (error) {
      recover('router.back', null, error);
      return;
    }
    try {
      originalReplace(fallback());
    } catch (error) {
      logRecoveredError('router.back:fallback', error, { fallback: fallback() });
    }
  }) as typeof router.back;
}
